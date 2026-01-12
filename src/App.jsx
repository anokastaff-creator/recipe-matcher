import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search, Plus, Utensils, ShoppingBasket, Trash2,
  CheckCircle, AlertCircle, RefreshCw, ChevronDown, ChevronUp,
  Square, CheckSquare, Tag, FolderPlus, X, Globe, Loader2
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

// --- INITIAL DATA (Fallbacks) ---

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

// --- STYLING ---

const CSS = `
  .app-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    font-family: sans-serif;
    color: #334155;
    background-color: #f8fafc;
    min-height: 100vh;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: white;
    padding: 15px 25px;
    border-radius: 16px;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    margin-bottom: 25px;
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #f97316;
    font-weight: bold;
    font-size: 20px;
  }
  .tabs {
    display: flex;
    gap: 8px;
    background: #f1f5f9;
    padding: 5px;
    border-radius: 12px;
  }
  .tab-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
    background: transparent;
    color: #64748b;
  }
  .tab-btn.active {
    background: white;
    color: #f97316;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }
  .card {
    background: white;
    padding: 20px;
    border-radius: 16px;
    border: 1px solid #e2e8f0;
    margin-bottom: 15px;
  }
  .search-input {
    width: 100%;
    padding: 12px 12px 12px 40px;
    border-radius: 12px;
    border: 1px solid #cbd5e1;
    font-size: 16px;
    outline: none;
    box-sizing: border-box;
  }
  .search-wrapper { position: relative; margin-bottom: 20px; }
  .search-icon { position: absolute; left: 12px; top: 12px; color: #94a3b8; }

  .recipe-item { cursor: pointer; transition: background 0.2s; }
  .recipe-item:hover { background-color: #fafafa; }

  .badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
  .badge-high { background: #dcfce7; color: #166534; }
  .badge-med { background: #ffedd5; color: #9a3412; }
  .badge-low { background: #f1f5f9; color: #475569; }

  .expanded-content {
    margin-top: 15px;
    border-top: 1px solid #f1f5f9;
    padding-top: 10px;
  }

  .section-title {
    font-size: 12px;
    font-weight: bold;
    text-transform: uppercase;
    color: #f97316;
    margin: 15px 0 8px 0;
  }

  .ing-row {
    display: flex;
    align-items: center;
    padding: 6px 10px;
    font-size: 13px;
    border-bottom: 1px solid #f8fafc;
    user-select: none;
  }
  .ing-row.owned { color: #15803d; }
  .ing-row.missing { color: #94a3b8; text-decoration: line-through; }

  .col-amount { width: 80px; flex-shrink: 0; color: #64748b; }
  .col-name { flex-grow: 1; font-weight: 600; }

  .instructions-box {
    margin-top: 10px;
    padding: 15px;
    background-color: #f8fafc;
    border-radius: 12px;
    font-size: 14px;
    color: #475569;
    white-space: pre-line;
    border: 1px solid #e2e8f0;
  }

  .pantry-row {
    display: flex;
    align-items: center;
    padding: 10px;
    background: #f8fafc;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    cursor: pointer;
    margin-bottom: 4px;
  }
  .pantry-row.checked { background: #f0fdf4; border-color: #dcfce7; }
  .checkbox-wrapper { margin-right: 12px; color: #94a3b8; }
  .pantry-row.checked .checkbox-wrapper { color: #16a34a; }
  .pantry-name { flex-grow: 1; font-size: 14px; font-weight: 500; }

  .btn-action { background: #f97316; color: white; border: none; padding: 10px 20px; border-radius: 10px; cursor: pointer; font-weight: bold; }
  .btn-trash { background: transparent; border: none; color: #cbd5e1; cursor: pointer; }

  .context-menu {
    position: fixed;
    z-index: 9999;
    background: white;
    border: 1px solid #e2e8f0;
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    border-radius: 12px;
    width: 220px;
    padding: 8px 0;
  }
  .context-menu-item {
    padding: 10px 14px;
    font-size: 13px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .context-menu-item:hover { background: #fff7ed; color: #f97316; }

  .new-cat-input-container { padding: 8px 12px; }
  .new-cat-input { width: 100%; padding: 6px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 12px; outline: none; }
`;

export default function App() {
  // --- STATE WITH PERSISTENCE LOADING ---

  const [recipes, setRecipes] = useState(() => {
    const saved = localStorage.getItem('recipes_data');
    return saved ? JSON.parse(saved) : INITIAL_RECIPES;
  });

  const [pantry, setPantry] = useState(() => {
    const saved = localStorage.getItem('pantry_data');
    return saved ? JSON.parse(saved) : INITIAL_PANTRY;
  });

  const [activeTab, setActiveTab] = useState('finder');
  const [search, setSearch] = useState('');
  const [newItem, setNewItem] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const [newRecipeName, setNewRecipeName] = useState('');
  const [newRecipeIngs, setNewRecipeIngs] = useState('');
  const [newRecipeInst, setNewRecipeInst] = useState('');

  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');

  const [contextMenu, setContextMenu] = useState({
    visible: false, x: 0, y: 0, ingredientName: '', flippedY: false, flippedX: false, isCreatingNew: false
  });
  const [newCatName, setNewCatName] = useState('');
  const newCatInputRef = useRef(null);

  // --- EFFECTS ---

  // Auto-save to LocalStorage whenever pantry or recipes change
  useEffect(() => {
    localStorage.setItem('recipes_data', JSON.stringify(recipes));
  }, [recipes]);

  useEffect(() => {
    localStorage.setItem('pantry_data', JSON.stringify(pantry));
  }, [pantry]);

  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.innerHTML = CSS;
    document.head.appendChild(styleTag);

    const handleGlobalClose = () => {
      setContextMenu(prev => ({ ...prev, visible: false, isCreatingNew: false }));
      setNewCatName('');
    };

    window.addEventListener('click', handleGlobalClose);
    window.addEventListener('contextmenu', handleGlobalClose);

    return () => {
      document.head.removeChild(styleTag);
      window.removeEventListener('click', handleGlobalClose);
      window.removeEventListener('contextmenu', handleGlobalClose);
    };
  }, []);

  useEffect(() => {
    if (contextMenu.isCreatingNew && newCatInputRef.current) {
      newCatInputRef.current.focus();
    }
  }, [contextMenu.isCreatingNew]);

  // --- LOGIC FUNCTIONS ---

  const saveRecipeToDatabase = (name, ingredientsArray, instructions) => {
    if (!name) return;
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
    setIsImporting(true);
    setImportError('');

    const apiKey = "";
    const systemPrompt = `Extract recipe data. Format ingredients as: "Amount, Name, Info, Category". Ensure category is one of Pantry, Produce, Meat, Dairy, Frozen, Bakery, Other. Return JSON with: name, ingredients (array of strings), instructions (string).`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Link: ${importUrl}` }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          tools: [{ "google_search": {} }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                ingredients: { type: "ARRAY", items: { type: "STRING" } },
                instructions: { type: "STRING" }
              }
            }
          }
        })
      });

      if (!response.ok) throw new Error("Connection failed.");
      const result = await response.json();
      const extracted = JSON.parse(result.candidates?.[0]?.content?.parts?.[0]?.text || "{}");

      if (extracted.name && extracted.ingredients) {
        saveRecipeToDatabase(extracted.name, extracted.ingredients, extracted.instructions);
        setImportUrl('');
        setActiveTab('finder');
      }
    } catch (err) {
      setImportError("Import failed.");
    } finally {
      setIsImporting(false);
    }
  };

  const scoredRecipes = useMemo(() => {
    return recipes.map(recipe => {
      const owned = recipe.ingredients.filter(fullIng => {
        const ingName = getIngName(fullIng);
        const found = pantry.find(p => p.name.toLowerCase() === ingName.toLowerCase());
        return found && found.available;
      }).length;
      const percent = Math.round((owned / recipe.ingredients.length) * 100);
      return { ...recipe, percent };
    }).sort((a, b) => b.percent - a.percent);
  }, [recipes, pantry]);

  const toggleAvailability = (name) => {
    setPantry(prev => prev.map(p =>
      p.name.toLowerCase() === name.toLowerCase()
        ? { ...p, available: !p.available }
        : p
    ));
  };

  const addPantryItem = () => {
    if (!newItem.trim()) return;
    const exists = pantry.some(p => p.name.toLowerCase() === newItem.trim().toLowerCase());
    if (!exists) {
      setPantry([...pantry, { name: newItem.trim(), available: true, category: 'Other' }]);
    }
    setNewItem('');
  };

  const handleContextMenu = (e, name) => {
    e.preventDefault();
    e.stopPropagation();
    const flippedX = e.clientX + 220 > window.innerWidth;
    const flippedY = e.clientY + 300 > window.innerHeight;
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, ingredientName: name, flippedX, flippedY, isCreatingNew: false });
  };

  const updateIngredientCategory = (name, finalCat) => {
    if (!finalCat) return;
    setPantry(prev => {
      const exists = prev.some(p => p.name.toLowerCase() === name.toLowerCase());
      if (exists) {
        return prev.map(p => p.name.toLowerCase() === name.toLowerCase() ? { ...p, category: finalCat } : p);
      }
      return [...prev, { name, available: false, category: finalCat }];
    });
    setContextMenu(prev => ({ ...prev, visible: false, isCreatingNew: false }));
  };

  const handleNewCatSubmit = (e) => {
    if (e.key === 'Enter' && newCatName.trim()) {
      updateIngredientCategory(contextMenu.ingredientName, newCatName.trim());
      setNewCatName('');
    }
  };

  // --- RENDER HELPERS ---

  const currentCategories = useMemo(() => {
    return Array.from(new Set(pantry.map(p => p.category || 'Other'))).sort();
  }, [pantry]);

  const groupedPantry = useMemo(() => {
    const groups = pantry.reduce((acc, item) => {
      const cat = item.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});
    Object.keys(groups).forEach(key => groups[key].sort((a, b) => a.name.localeCompare(b.name)));
    return groups;
  }, [pantry]);

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo"><Utensils /> <span>RecipeMatcher</span></div>
        <div className="tabs">
          <button className={`tab-btn ${activeTab === 'finder' ? 'active' : ''}`} onClick={() => setActiveTab('finder')}>Finder</button>
          <button className={`tab-btn ${activeTab === 'pantry' ? 'active' : ''}`} onClick={() => setActiveTab('pantry')}>Pantry</button>
          <button className={`tab-btn ${activeTab === 'recipes' ? 'active' : ''}`} onClick={() => setActiveTab('recipes')}>Database</button>
        </div>
      </header>

      {contextMenu.visible && (
        <div className="context-menu" style={{
          top: contextMenu.flippedY ? 'auto' : contextMenu.y,
          bottom: contextMenu.flippedY ? (window.innerHeight - contextMenu.y) : 'auto',
          left: contextMenu.flippedX ? 'auto' : contextMenu.x,
          right: contextMenu.flippedX ? (window.innerWidth - contextMenu.x) : 'auto'
        }} onClick={e => e.stopPropagation()}>
          <div className="context-menu-title">Category: {contextMenu.ingredientName}</div>
          {!contextMenu.isCreatingNew ? (
            <>
              {currentCategories.map(cat => (
                <div key={cat} className="context-menu-item" onClick={() => updateIngredientCategory(contextMenu.ingredientName, cat)}>
                  <Tag size={12} /> {cat}
                </div>
              ))}
              <div className="context-menu-item" onClick={() => setContextMenu(prev => ({ ...prev, isCreatingNew: true }))}>
                <FolderPlus size={12} /> Add New Group...
              </div>
            </>
          ) : (
            <div className="new-cat-input-container">
              <input ref={newCatInputRef} className="new-cat-input" value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={handleNewCatSubmit} placeholder="New group name..." />
            </div>
          )}
        </div>
      )}

      {activeTab === 'finder' && (
        <div className="view">
          <div className="search-wrapper">
            <Search className="search-icon" size={20} />
            <input className="search-input" placeholder="Search recipes..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {scoredRecipes.filter(r => r.name.toLowerCase().includes(search.toLowerCase())).map(recipe => (
            <div key={recipe.id} className="card recipe-item" onClick={() => setExpandedId(expandedId === recipe.id ? null : recipe.id)}>
              <div className="recipe-header">
                <div style={{fontWeight: 'bold', fontSize: '18px'}}>{recipe.name}</div>
                <div className={`badge ${recipe.percent === 100 ? 'badge-high' : 'badge-med'}`}>{recipe.percent}% Match</div>
              </div>
              {expandedId === recipe.id && (
                <div className="expanded-content" onClick={e => e.stopPropagation()}>
                  <div className="section-title">Ingredients Checklist</div>
                  {recipe.ingredients.map(fullIng => {
                    const name = getIngName(fullIng);
                    const parts = fullIng.split(',').map(p => p.trim());
                    const hasIt = pantry.find(p => p.name.toLowerCase() === name.toLowerCase())?.available;
                    return (
                      <div key={fullIng} className={`ing-row ${hasIt ? 'owned' : 'missing'}`} onContextMenu={e => handleContextMenu(e, name)}>
                        {hasIt && <CheckCircle size={14} style={{marginRight: '8px', color: '#16a34a'}} />}
                        <span className="col-amount">{parts[0]}</span>
                        <span className="col-name">{name}</span>
                      </div>
                    );
                  })}
                  <div className="section-title">Instructions</div>
                  <div className="instructions-box">{recipe.instructions}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'pantry' && (
        <div className="view card">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h3>Pantry</h3>
            <button className="btn-trash" style={{fontSize: '12px', color: '#ef4444'}} onClick={() => { if(confirm("Clear all pantry data?")) { setPantry([]); localStorage.removeItem('pantry_data'); } }}>Reset Pantry</button>
          </div>
          <div className="input-row">
            <input className="search-input" style={{paddingLeft: '15px'}} placeholder="Add ingredient..." value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPantryItem()} />
            <button className="btn-action" onClick={addPantryItem}>Add</button>
          </div>
          {Object.keys(groupedPantry).sort().map(cat => (
            <div key={cat}>
              <div style={{fontSize: '11px', fontWeight: 'bold', margin: '15px 0 5px 5px', color: '#94a3b8'}}>{cat}</div>
              {groupedPantry[cat].map(item => (
                <div key={item.name} className={`pantry-row ${item.available ? 'checked' : ''}`} onClick={() => toggleAvailability(item.name)} onContextMenu={e => handleContextMenu(e, item.name)}>
                  <div className="checkbox-wrapper">{item.available ? <CheckSquare size={20} /> : <Square size={20} />}</div>
                  <span className="pantry-name">{item.name}</span>
                  <button className="btn-trash" onClick={e => (e.stopPropagation(), setPantry(pantry.filter(p => p.name !== item.name)))}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'recipes' && (
        <div className="view">
          <div className="card" style={{background: '#eff6ff'}}>
            <h3 style={{display: 'flex', alignItems: 'center', gap: '8px'}}><Globe size={18} /> URL Import</h3>
            <div className="input-row">
              <input className="search-input" style={{paddingLeft: '15px'}} placeholder="Paste link..." value={importUrl} onChange={e => setImportUrl(e.target.value)} />
              <button className="btn-action" style={{background: '#2563eb'}} onClick={handleUrlImport} disabled={isImporting}>{isImporting ? <Loader2 className="animate-spin" size={16} /> : 'Import'}</button>
            </div>
            {importError && <div style={{color: '#dc2626', fontSize: '12px', marginTop: '10px'}}>{importError}</div>}
          </div>
          <div className="card">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h3>Manual Add</h3>
              <button className="btn-trash" style={{fontSize: '12px', color: '#ef4444'}} onClick={() => { if(confirm("Clear all recipe data?")) { setRecipes([]); localStorage.removeItem('recipes_data'); } }}>Clear All Recipes</button>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
              <input className="search-input" style={{paddingLeft: '15px'}} placeholder="Name" value={newRecipeName} onChange={e => setNewRecipeName(e.target.value)} />
              <textarea className="search-input" style={{paddingLeft: '15px', height: '80px', paddingTop: '10px'}} placeholder="Ingredients (one per line: Amount, Name, Info, Category)" value={newRecipeIngs} onChange={e => setNewRecipeIngs(e.target.value)} />
              <textarea className="search-input" style={{paddingLeft: '15px', height: '80px', paddingTop: '10px'}} placeholder="Instructions" value={newRecipeInst} onChange={e => setNewRecipeInst(e.target.value)} />
              <button className="btn-action" onClick={() => {saveRecipeToDatabase(newRecipeName, newRecipeIngs.split('\n').filter(i => i.trim()), newRecipeInst); setActiveTab('finder'); setNewRecipeName(''); setNewRecipeIngs(''); setNewRecipeInst('');}}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
