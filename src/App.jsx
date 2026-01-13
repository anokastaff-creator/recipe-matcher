import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Utensils, 
  ShoppingBasket, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Download,
  Upload,
  ClipboardCheck,
  X,
  Globe,
  Loader2,
  Tag,
  FolderPlus,
  CheckSquare,
  Square
} from 'lucide-react';

// --- HELPER FUNCTIONS ---

const getIngName = (fullString) => {
  if (!fullString) return "";
  const parts = fullString.split(',').map(p => p.trim());
  return parts[1] || parts[0];
};

const getIngCategory = (fullString) => {
  if (!fullString) return "Other";
  const parts = fullString.split(',').map(p => p.trim());
  return parts[3] || 'Other';
};

// --- INITIAL DATA (Fallbacks if the vault is empty) ---

const INITIAL_RECIPES = [
  {
    id: '1',
    name: 'Classic Tomato Pasta',
    ingredients: [
      '1 lb, Pasta, Dry, Pantry', 
      '2 cups, Tomato Sauce, Marinara, Pantry', 
      '3 cloves, Garlic, Minced, Produce', 
      '2 tbsp, Olive Oil, Extra Virgin, Pantry', 
      '5 leaves, Basil, Fresh, Produce'
    ],
    instructions: '1. Boil pasta.\n2. Sauté garlic in oil.\n3. Add sauce and simmer.\n4. Toss with pasta and basil.'
  }
];

const INITIAL_PANTRY = [
  { name: 'Pasta', available: true, category: 'Pantry' },
  { name: 'Garlic', available: true, category: 'Produce' },
  { name: 'Olive Oil', available: true, category: 'Pantry' }
];

const App = () => {
  // --- STATE WITH PERSISTENCE (The Vault) ---

  // We check LocalStorage (the vault) immediately when the app starts
  const [recipes, setRecipes] = useState(() => {
    const saved = localStorage.getItem('recipe_matcher_recipes');
    return saved ? JSON.parse(saved) : INITIAL_RECIPES;
  });

  const [pantry, setPantry] = useState(() => {
    const saved = localStorage.getItem('recipe_matcher_pantry');
    return saved ? JSON.parse(saved) : INITIAL_PANTRY;
  });

  const [activeTab, setActiveTab] = useState('finder');
  const [searchQuery, setSearchQuery] = useState('');
  const [newIngredient, setNewIngredient] = useState('');
  const [expandedRecipeId, setExpandedRecipeId] = useState(null);
  
  // Modal & Form States
  const [isAddingRecipe, setIsAddingRecipe] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [importError, setImportError] = useState('');

  // Manual Entry States
  const [newRecipeName, setNewRecipeName] = useState('');
  const [newRecipeIngs, setNewRecipeIngs] = useState('');
  const [newRecipeInstructions, setNewRecipeInstructions] = useState('');

  // Context Menu State (Right-Click)
  const [contextMenu, setContextMenu] = useState({ 
    visible: false, x: 0, y: 0, ingredientName: '', flippedY: false, flippedX: false, isCreatingNew: false
  });
  const [newCatName, setNewCatName] = useState('');
  const newCatInputRef = useRef(null);

  // --- EFFECTS (Auto-Saving) ---

  // Every time recipes change, update the vault
  useEffect(() => {
    localStorage.setItem('recipe_matcher_recipes', JSON.stringify(recipes));
  }, [recipes]);

  // Every time pantry changes, update the vault
  useEffect(() => {
    localStorage.setItem('recipe_matcher_pantry', JSON.stringify(pantry));
  }, [pantry]);

  // Global click listener to close the right-click menu
  useEffect(() => {
    const handleGlobalClose = () => {
      setContextMenu(prev => ({ ...prev, visible: false, isCreatingNew: false }));
      setNewCatName('');
    };
    window.addEventListener('click', handleGlobalClose);
    window.addEventListener('contextmenu', handleGlobalClose);
    return () => {
      window.removeEventListener('click', handleGlobalClose);
      window.removeEventListener('contextmenu', handleGlobalClose);
    };
  }, []);

  // Autofocus the "New Category" input
  useEffect(() => {
    if (contextMenu.isCreatingNew && newCatInputRef.current) {
      newCatInputRef.current.focus();
    }
  }, [contextMenu.isCreatingNew]);

  // --- LOGIC: MATCHING ---

  const scoredRecipes = useMemo(() => {
    return recipes.map(recipe => {
      const matchCount = recipe.ingredients.filter(fullIng => {
        const name = getIngName(fullIng);
        const found = pantry.find(p => p.name.toLowerCase() === name.toLowerCase());
        return found && found.available;
      }).length;
      
      const percentage = recipe.ingredients.length > 0 
        ? Math.round((matchCount / recipe.ingredients.length) * 100) 
        : 0;

      return { ...recipe, percentage };
    }).sort((a, b) => b.percentage - a.percentage);
  }, [recipes, pantry]);

  // --- ACTIONS ---

  const togglePantryAvailability = (name) => {
    setPantry(prev => prev.map(p => 
      p.name.toLowerCase() === name.toLowerCase() ? { ...p, available: !p.available } : p
    ));
  };

  const handleManualAddPantry = () => {
    if (!newIngredient.trim()) return;
    const exists = pantry.some(p => p.name.toLowerCase() === newIngredient.trim().toLowerCase());
    if (!exists) {
      setPantry([...pantry, { name: newIngredient.trim(), available: true, category: 'Other' }]);
    }
    setNewIngredient('');
  };

  const saveRecipeToDatabase = (name, ingredientsArray, instructions) => {
    const newRecipe = {
      id: Date.now().toString(),
      name,
      ingredients: ingredientsArray,
      instructions
    };

    setPantry(prev => {
      let updated = [...prev];
      ingredientsArray.forEach(ingStr => {
        const ingName = getIngName(ingStr);
        const category = getIngCategory(ingStr);
        const index = updated.findIndex(p => p.name.toLowerCase() === ingName.toLowerCase());
        
        if (index === -1) {
          updated.push({ name: ingName, available: false, category });
        } else if (updated[index].category === 'Other' && category !== 'Other') {
          updated[index].category = category;
        }
      });
      return updated;
    });

    setRecipes(prev => [newRecipe, ...prev]);
  };

  const handleUrlImport = async () => {
    if (!importUrl) return;
    setIsAiLoading(true);
    setImportError('');

    const apiKey = ""; // Provided by environment
    const systemPrompt = "Extract recipe data. Format ingredients as: 'Amount, Name, Info, Category'. Return JSON.";

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `URL: ${importUrl}` }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          tools: [{ "google_search": {} }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const result = await response.json();
      const extracted = JSON.parse(result.candidates?.[0]?.content?.parts?.[0]?.text || "{}");

      if (extracted.name && extracted.ingredients) {
        saveRecipeToDatabase(extracted.name, extracted.ingredients, extracted.instructions);
        setImportUrl('');
        setActiveTab('finder');
      }
    } catch (err) {
      setImportError("Failed to import.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleContextMenu = (e, name) => {
    e.preventDefault();
    e.stopPropagation();
    const flippedX = e.clientX + 220 > window.innerWidth;
    const flippedY = e.clientY + 300 > window.innerHeight;
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, ingredientName: name, flippedX, flippedY, isCreatingNew: false });
  };

  const updateCategory = (name, cat) => {
    setPantry(prev => prev.map(p => 
      p.name.toLowerCase() === name.toLowerCase() ? { ...p, category: cat } : p
    ));
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  // --- RENDER HELPERS ---

  const categories = useMemo(() => Array.from(new Set(pantry.map(p => p.category || 'Other'))).sort(), [pantry]);

  const groupedPantry = useMemo(() => {
    const groups = pantry.reduce((acc, item) => {
      const cat = item.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});
    Object.keys(groups).forEach(k => groups[k].sort((a, b) => a.name.localeCompare(b.name)));
    return groups;
  }, [pantry]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-500 rounded-lg shadow-sm"><Utensils className="text-white w-6 h-6" /></div>
            <h1 className="text-xl font-bold tracking-tight">RecipeMatcher</h1>
          </div>
          <nav className="flex bg-slate-100 p-1 rounded-xl">
            {['finder', 'pantry', 'recipes'].map((t) => (
              <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* RIGHT-CLICK MENU */}
      {contextMenu.visible && (
        <div className="fixed z-50 bg-white border shadow-xl rounded-xl w-52 py-2" style={{ 
          top: contextMenu.flippedY ? 'auto' : contextMenu.y,
          bottom: contextMenu.flippedY ? (window.innerHeight - contextMenu.y) : 'auto',
          left: contextMenu.flippedX ? 'auto' : contextMenu.x,
          right: contextMenu.flippedX ? (window.innerWidth - contextMenu.x) : 'auto'
        }} onClick={e => e.stopPropagation()}>
          <div className="px-4 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b mb-1">Categorize: {contextMenu.ingredientName}</div>
          {!contextMenu.isCreatingNew ? (
            <>
              {categories.map(cat => (
                <button key={cat} className="w-full text-left px-4 py-2 text-sm hover:bg-orange-50 hover:text-orange-600 flex items-center gap-2" onClick={() => updateCategory(contextMenu.ingredientName, cat)}>
                  <Tag size={12} /> {cat}
                </button>
              ))}
              <button className="w-full text-left px-4 py-2 text-sm hover:bg-orange-50 border-t mt-1 flex items-center gap-2" onClick={() => setContextMenu(prev => ({ ...prev, isCreatingNew: true }))}>
                <FolderPlus size={12} /> New Group...
              </button>
            </>
          ) : (
            <div className="p-3">
              <input ref={newCatInputRef} className="w-full border rounded p-2 text-xs outline-none focus:ring-1 focus:ring-orange-500" value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && updateCategory(contextMenu.ingredientName, newCatName)} placeholder="Group Name..." />
            </div>
          )}
        </div>
      )}

      <main className="max-w-4xl mx-auto p-4 pb-20">
        {activeTab === 'finder' && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input type="text" placeholder="Search saved recipes..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-orange-500 rounded-xl transition-all outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>
            {scoredRecipes.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())).map(recipe => (
              <div key={recipe.id} className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="p-5 cursor-pointer flex justify-between items-center" onClick={() => setExpandedRecipeId(expandedRecipeId === recipe.id ? null : recipe.id)}>
                  <div className="font-bold flex items-center gap-2">
                    {recipe.name} {expandedRecipeId === recipe.id ? <ChevronUp size={16} className="opacity-30" /> : <ChevronDown size={16} className="opacity-30" />}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${recipe.percentage === 100 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{recipe.percentage}% Match</div>
                </div>
                {expandedRecipeId === recipe.id && (
                  <div className="p-5 border-t bg-slate-50/30 space-y-4">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ingredients Checklist (Right-Click to move)</div>
                    <div className="space-y-1">
                      {recipe.ingredients.map(full => {
                        const name = getIngName(full);
                        const parts = full.split(',').map(p => p.trim());
                        const hasIt = pantry.find(p => p.name.toLowerCase() === name.toLowerCase())?.available;
                        return (
                          <div key={full} className={`flex items-center text-sm py-1 ${hasIt ? 'text-green-700' : 'text-slate-400 line-through'}`} onContextMenu={e => handleContextMenu(e, name)}>
                            {hasIt && <CheckCircle2 size={14} className="mr-2" />}
                            <span className="w-20 opacity-60">{parts[0]}</span>
                            <span className="font-semibold">{name}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Instructions</div>
                    <p className="text-sm text-slate-600 whitespace-pre-line bg-white p-4 rounded-xl border border-slate-100">{recipe.instructions}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'pantry' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Stock Your Kitchen</h2>
              <div className="flex gap-2">
                <input type="text" placeholder="Add ingredient..." className="flex-1 px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-orange-500" value={newIngredient} onChange={(e) => setNewIngredient(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleManualAddPantry()} />
                <button onClick={handleManualAddPantry} className="bg-orange-500 text-white px-6 rounded-xl font-bold">Add</button>
              </div>
            </div>
            {Object.keys(groupedPantry).sort().map(cat => (
              <div key={cat} className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2"><Tag size={10} /> {cat}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {groupedPantry[cat].map(item => (
                    <div key={item.name} className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${item.available ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`} onClick={() => togglePantryAvailability(item.name)} onContextMenu={e => handleContextMenu(e, item.name)}>
                      <div className="flex items-center gap-3">
                        {item.available ? <CheckSquare className="text-green-600" size={20} /> : <Square className="text-slate-300" size={20} />}
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      <button onClick={e => (e.stopPropagation(), setPantry(pantry.filter(p => p.name !== item.name)))} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'recipes' && (
          <div className="space-y-6">
            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 shadow-sm">
              <h2 className="text-indigo-900 font-bold mb-2 flex items-center gap-2"><Globe size={18} /> Magic URL Import</h2>
              <p className="text-xs text-indigo-600 mb-4">Paste any link to add it to your permanent database.</p>
              <div className="flex gap-2">
                <input type="text" placeholder="https://..." className="flex-1 px-4 py-3 bg-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" value={importUrl} onChange={e => setImportUrl(e.target.value)} disabled={isAiLoading} />
                <button onClick={handleUrlImport} disabled={isAiLoading || !importUrl} className="bg-indigo-600 text-white px-6 rounded-xl font-bold disabled:opacity-50">{isAiLoading ? <Loader2 size={16} className="animate-spin" /> : 'Import'}</button>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <h2 className="font-bold mb-4">Manual Entry</h2>
              <div className="space-y-3">
                <input className="w-full px-4 py-2 bg-slate-50 border rounded-lg outline-none" placeholder="Recipe Name" value={newRecipeName} onChange={e => setNewRecipeName(e.target.value)} />
                <textarea className="w-full px-4 py-2 bg-slate-50 border rounded-lg outline-none h-24 text-sm" placeholder="Ingredients (Amount, Name, Info, Category)" value={newRecipeIngs} onChange={e => setNewRecipeIngs(e.target.value)} />
                <textarea className="w-full px-4 py-2 bg-slate-50 border rounded-lg outline-none h-24 text-sm" placeholder="Steps..." value={newRecipeInstructions} onChange={e => setNewRecipeInstructions(e.target.value)} />
                <button className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold" onClick={() => (saveRecipeToDatabase(newRecipeName, newRecipeIngs.split('\n').filter(i => i.trim()), newRecipeInstructions), setNewRecipeName(''), setNewRecipeIngs(''), setNewRecipeInstructions(''), setActiveTab('finder'))}>Save to Database</button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Library</div>
              {recipes.map(r => (
                <div key={r.id} className="bg-white p-4 rounded-xl border flex justify-between items-center group">
                  <div className="font-bold">{r.name}</div>
                  <button onClick={() => setRecipes(recipes.filter(re => re.id !== r.id))} className="text-slate-300 hover:text-red-500"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
            <button className="w-full py-4 text-red-500 text-xs font-bold uppercase tracking-widest border border-dashed border-red-200 rounded-xl hover:bg-red-50" onClick={() => confirm("Reset all data?") && (localStorage.clear(), window.location.reload())}>Delete All Data & Start Fresh</button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
