import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ChefHat, Search, Loader2, Plus, CheckCircle, Trash2,
  Save as SaveIcon, User, X, Moon, Sun, RefreshCw, ClipboardType, AlignLeft, Edit2,
  Camera, Link as LinkIcon, Layers, Bug, Key, Maximize2, Wifi, WifiOff
} from 'lucide-react';

// Firebase Imports
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth, signInAnonymously, onAuthStateChanged,
  signInWithCustomToken, GoogleAuthProvider, signInWithPopup,
  signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import {
  getFirestore, collection, doc, onSnapshot, updateDoc,
  deleteDoc, addDoc, setDoc, enableIndexedDbPersistence,
  disableNetwork, enableNetwork
} from 'firebase/firestore';

/**
 * --- CONFIGURATION & INITIALIZATION ---
 */
const initializeFirebase = () => {
  let app, auth, db, googleProvider;
  let initError = null;
  let isDummyConfig = false;

  try {
    let firebaseConfig;
    if (typeof __firebase_config !== 'undefined') {
      if (typeof __firebase_config === 'string') {
        try {
          firebaseConfig = JSON.parse(__firebase_config);
        } catch (e) {
          console.warn("Failed to parse __firebase_config");
        }
      } else {
        firebaseConfig = __firebase_config;
      }
    }

    if (!firebaseConfig) {
      firebaseConfig = {
        apiKey: "AIzaSyCLATlr-23t3HYoH0euBtZ7IG4IM5DLVPM",
        authDomain: "recipe-matcher-3e89d.firebaseapp.com",
        projectId: "recipe-matcher-3e89d",
        storageBucket: "recipe-matcher-3e89d.firebasestorage.app",
        messagingSenderId: "414903191846",
        appId: "1:414903191846:web:b0652a25fd957b2f42d9e7",
        measurementId: "G-0CLB5VSR5F"
      };
    }

    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      enableIndexedDbPersistence(db).catch((err) => {
          console.warn("Persistence failed (common in private/incognito windows):", err.code);
      });
    } else {
      app = getApp();
      db = getFirestore(app);
    }

    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();

  } catch (e) {
    console.error("Critical Init Error:", e);
    initError = e.message;
    isDummyConfig = true;
  }

  return { app, auth, db, googleProvider, initError, isDummyConfig };
};

// Initialize once
const fb = initializeFirebase();

const appId = typeof __app_id !== 'undefined' ? __app_id : 'recipe-matcher-v2';

// --- DATA: MASTER INGREDIENT LIST ---
const MASTER_INGREDIENTS = {
  "Meats": [
    "Ground Beef", "Beef Ribeye", "Beef Brisket", "Chuck Roast", "Beef Stew Meat", "Flank Steak",
    "Pork Shoulder", "Pork Chop", "Pork Belly", "Bacon", "Pancetta", "Prosciutto", "Ham",
    "Sausage", "Bratwurst", "Frankfurter", "Chorizo", "Italian Sausage", "Pepperoni", "Ground Pork",
    "Chicken Breast", "Chicken Thigh", "Chicken Wing", "Whole Turkey", "Duck", "Shrimp", "Salmon",
    "Cod", "Tuna", "Anchovy", "Clam", "Squid", "Crab", "Tofu", "Lamb", "Liver",
    "Sirloin Steak", "Pork"
  ],
  "Produce": [
    "Onion", "Red Onion", "Garlic", "Ginger", "Scallion", "Shallot", "Lemongrass", "Celery",
    "Carrot", "Bell Pepper", "Jalapeño", "Poblano", "Serrano Pepper", "Bird’s Eye Chili",
    "Roma Tomato", "Tomatillo", "Russet Potato", "Cabbage",
    "Bok Choy", "Broccoli", "Cauliflower", "Corn", "Button Mushroom", "Shiitake Mushroom", "Eggplant",
    "Zucchini", "Cucumber", "Spinach", "Kale", "Green Bean", "Snow Pea", "Asparagus", "Radish",
    "Bean Sprout", "Avocado", "Lime", "Lemon", "Apple", "Mango", "Pineapple", "Coconut", "Tamarind",
    "Fresh Basil", "Thai Basil", "Holy Basil", "Cilantro", "Parsley", "Dill", "Chives", "Mint", "Green Pea",
    "Portabella Mushroom", "Mushrooms", "Potatoes", "Red Pepper"
  ],
  "Pantry": [
    "Dried Ancho Chili", "Dried Red Chili", "Jasmine Rice", "White Rice", "Brown Rice", "Arborio Rice", "Sticky Rice", "Gnocchi",
    "Pasta", "Egg Noodle", "Rice Noodle", "Glass Noodle", "Corn Tortilla", "Flour Tortilla",
    "White Bread", "Rye Bread", "Breadcrumbs", "Cornmeal", "Masa Harina", "Oats", "All-Purpose Flour",
    "Cornstarch", "Potato Starch", "Baking Powder", "Baking Soda", "Yeast", "Chicken Stock", "Beef Stock", "Chicken Broth",
    "Canned San Marzano Tomato", "Tomato Paste", "Tomato Sauce", "Coconut Milk", "Coconut Cream",
    "Pickle", "Sauerkraut", "Capers", "Black Olive", "Peanut Butter", "Roasted Peanut", "Walnut",
    "Pine Nut", "Almond", "Vegetable Oil", "Canola Oil", "Olive Oil", "Lard", "Sesame Oil", "Peanut Oil", "Coconut Oil",
    "White Vinegar", "Apple Cider Vinegar", "Balsamic Vinegar", "Red Wine Vinegar", "Rice Vinegar", "Rice Wine Vinegar",
    "Black Vinegar", "Honey", "Maple Syrup", "Sugar", "Brown Sugar", "Palm Sugar", "Semi-sweet Chocolate",
    "Cocoa Powder", "Vanilla Extract", "Powdered Sugar", "Gelatin", "Chicken Bouillon", "Lasagna Sheet",
    "Taco Shell", "Tortilla Chip", "Sesame Seed", "Dried Cranberry", "Almond Flour", "Molasses", "Agave Nectar",
    "Cream of Chicken Soup", "Cream of Mushroom Soup", "Pimentos", "Beef Bouillon", "Noodles", "Diced Tomatoes", "Spaghetti", "Rice", "Long Grain Rice"
  ],
  "Dairy": [
    "Whole Milk", "Heavy Cream", "Sour Cream", "Yogurt", "Buttermilk", "Condensed Milk", "Evaporated Milk",
    "Cheddar Cheese", "Low Moisture Mozzarella", "Fresh Mozzarella", "Parmesan Cheese", "Ricotta Cheese",
    "Provolone Cheese", "Monterey Jack Cheese", "Queso Fresco", "Cotija Cheese", "Oaxaca Cheese",
    "Swiss Cheese", "Cream Cheese", "Gouda Cheese", "Butter", "Egg",
    "Milk"
  ],
  "Sauces": [
    "Soy Sauce", "Dark Soy Sauce", "Oyster Sauce", "Fish Sauce", "Hoisin Sauce", "Chili Garlic Sauce",
    "Sriracha", "Worcestershire Sauce", "Ketchup", "Yellow Mustard", "Dijon Mustard", "Mayonnaise",
    "BBQ Sauce", "Hot Sauce", "Salsa", "Mole Paste", "Red Curry Paste", "Green Curry Paste", "Shrimp Paste",
    "Tamarind Paste", "Broad Bean Paste", "Miso", "Sweet Chili Sauce", "Plum Sauce", "Black Bean Sauce",
    "Ranch Dressing", "Blue Cheese Dressing", "Caesar Dressing", "Horseradish",
    "Enchilada Sauce"
  ],
  "Seasonings": [
    "Salt", "Black Pepper", "White Pepper", "Cumin", "Chili Powder", "Sweet Paprika", "Smoked Paprika",
    "Cayenne Pepper", "Red Pepper Flake", "Mexican Oregano", "Dried Oregano", "Dried Basil", "Thyme",
    "Rosemary", "Sage", "Bay Leaf", "Cinnamon", "Nutmeg", "Clove", "Allspice", "Caraway Seed",
    "Fennel Seed", "Ground Coriander", "Turmeric", "Star Anise", "Sichuan Peppercorn", "Five Spice Powder",
    "Garlic Powder", "Onion Powder", "MSG", "Curry Powder", "Italian Seasoning", "Taco Seasoning", "Saffron",
    "Pepper"
  ],
  "Other": [
    "Red Wine", "White Wine", "Shaoxing Wine", "Beer",
    "Sherry", "Water"
  ]
};

const CATEGORY_TABS = Object.keys(MASTER_INGREDIENTS);

/**
 * --- HELPERS ---
 */
const toTitleCase = (str) => {
  if (!str) return "";
  return String(str).toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const parseAndSanitizeAIJSON = (text) => {
  try {
    return JSON.parse(text);
  } catch (e) {
    try {
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e2) {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (e3) {
          throw new Error("Found JSON-like block but failed to parse.");
        }
      }
      throw new Error("Invalid JSON format from AI.");
    }
  }
};

/**
 * --- COMPONENTS ---
 */

// Auto-Expanding Textarea Component
const AutoTextarea = ({ value, onChange, className, placeholder }) => {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      className={className}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={1}
      style={{ overflow: 'hidden' }}
    />
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('recipes');
  const [recipes, setRecipes] = useState(null);
  const [pantry, setPantry] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('rm_theme_v143') || 'dark');
  const [colorTheme, setColorTheme] = useState(() => localStorage.getItem('rm_color_theme') || 'orange');
  const [debugLogs, setDebugLogs] = useState([]);
  const isAutoLoginAttempted = useRef(false);

  // Full Screen & Resizable Layout State
  const [fullScreenRecipe, setFullScreenRecipe] = useState(null);
  const [splitRatio, setSplitRatio] = useState(50); // percentage for left column
  const isResizingRef = useRef(false);

  // New State for Test API Key
  const [testApiKey, setTestApiKey] = useState('');

  // Pantry UI State
  const [activePantryCategory, setActivePantryCategory] = useState("Meats");

  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [newItem, setNewItem] = useState('');

  // Recipe Editing State
  const [editingRecipeId, setEditingRecipeId] = useState(null);
  const [editRecipeForm, setEditRecipeForm] = useState({ name: '', ingredients: '', instructions: '' });

  // Delete Confirmation State
  const [deleteConfirmation, setDeleteConfirmation] = useState(null); // { id: string, name: string, collection: 'pantry'|'recipes' }

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [isImporting, setIsImporting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false); // AI Analysis State
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 }); // NEW: Batch State
  const [manual, setManual] = useState({ name: '', ings: '', inst: '', source: '' });
  const [rawTextImport, setRawTextImport] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    console.log("App Mounted - v2.9.16");
    // Ensure CSS root variables are set correctly on mount
    const root = document.documentElement;
    if (!root.className) root.className = 'dark';
  }, []);

  // Splitter Handlers
  const startResizing = () => {
    isResizingRef.current = true;
  };
  const stopResizing = () => {
    isResizingRef.current = false;
  };
  const handleResize = (e) => {
    if (!isResizingRef.current) return;
    const newRatio = (e.clientX / window.innerWidth) * 100;
    if (newRatio > 20 && newRatio < 80) setSplitRatio(newRatio);
  };

  useEffect(() => {
    if (fullScreenRecipe) {
      window.addEventListener('mousemove', handleResize);
      window.addEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [fullScreenRecipe]);

  const addLog = (msg) => {
    const time = new Date().toLocaleTimeString();
    setDebugLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 30));
    console.log(`[RecipeMatcher] ${msg}`); // Also log to console for robust debugging
  };

  const getSafeUid = (u) => String(u?.uid || 'guest').replace(/\//g, '_');

  // Compute Available Ingredients
  const availableIngredients = useMemo(() => {
    const items = pantry || [];
    const availableSet = new Set();
    const dbStatusMap = new Map();

    // 1. Add all items from DB that are 'have'
    items.forEach(i => {
      const lowerName = (i.name || "").toLowerCase();
      const isAvailable = i.status === 'have' || (i.status === undefined && i.available === true);
      dbStatusMap.set(lowerName, isAvailable ? 'have' : 'dont_have');
      if (isAvailable) availableSet.add(lowerName);
    });

      // 2. Add Master List defaults (only if not already decided by DB)
      Object.keys(MASTER_INGREDIENTS).forEach(cat => {
        MASTER_INGREDIENTS[cat].forEach(name => {
          const lowerName = name.toLowerCase();
          if (!dbStatusMap.has(lowerName)) {
            availableSet.add(lowerName);
          }
        });
      });
      return availableSet;
  }, [pantry]);

  const isIngredientAvailable = (recipeLine, availableSet) => {
    const lowerLine = String(recipeLine).toLowerCase();
    for (let availableItem of availableSet) {
      if (lowerLine.includes(availableItem)) {
        return true;
      }
    }
    return false;
  };

  const scoredRecipes = useMemo(() => {
    const list = recipes || [];

    return list.map(recipe => {
      const recipeLines = String(recipe.ingredients || "").split('\n').filter(l => l.trim().length > 0);
      if (recipeLines.length === 0) return { ...recipe, percent: 0 };

      const matchCount = recipeLines.reduce((count, line) => {
        return count + (isIngredientAvailable(line, availableIngredients) ? 1 : 0);
      }, 0);

      return { ...recipe, percent: Math.round((matchCount / recipeLines.length) * 100) };
    })
    .filter(r => (r.name || "").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.percent || 0) - (a.percent || 0));
  }, [recipes, availableIngredients, search]);

  useEffect(() => {
    // Theme Colors Logic Restored
    const colors = {
      orange: { primary: '#fb923c', dark: '#ea580c', tint: 'rgba(251, 146, 60, 0.1)' },
          blue: { primary: '#38bdf8', dark: '#0284c7', tint: 'rgba(56, 189, 248, 0.1)' }
    };
    const activeColors = colors[colorTheme];

    const style = document.createElement('style');
    style.innerHTML = `
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    
    :root {
      --primary: ${activeColors.primary};
      --primary-dark: ${activeColors.dark};
      --bg: transparent;
      --card: rgba(255, 255, 255, 0.95);
      --text: #1e293b;
      --muted: #64748b;
      --border: #e2e8f0;
      --header: rgba(255, 255, 255, 0.98);
      --input-bg: #f8fafc;
    }
    .dark {
      --primary: ${activeColors.primary};
      --primary-dark: ${activeColors.dark};
      --bg: transparent;
      --card: rgba(30, 41, 59, 0.95);
      --text: #f1f5f9;
      --muted: #94a3b8;
      --border: #334155;
      --header: rgba(15, 23, 42, 0.98);
      --input-bg: rgba(255,255,255,0.05);
    }

    /* UTILITY CLASSES */
    .text-primary { color: var(--primary); }

    html, body {
      margin: 0; padding: 0; min-height: 100%;
      background: var(--bg); color: var(--text);
      transition: color 0.2s ease; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-text-size-adjust: 100%;
    }
    .fixed-background { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: -10; background-color: #f8fafc; background-image: url('https://images.unsplash.com/photo-1495195134817-aeb325a55b65?q=80&w=1776&auto=format&fit=crop'); background-size: cover; background-position: center; background-attachment: fixed; }
    .fixed-background::after { content: ''; position: absolute; inset: 0; background: rgba(255,255,255,0.7); }
    .dark .fixed-background { background-color: #0f172a; }
    .dark .fixed-background::after { background: rgba(15, 23, 42, 0.85); }
    
    .app-container { width: 100%; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding-bottom: 80px; position: relative; overflow-x: hidden; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .animate-spin { animation: spin 1s linear infinite; }

    /* Header Styles */
    .header { width: 100%; position: sticky; top: 0; background: var(--header); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); z-index: 100; display: flex; justify-content: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .header-content {
      width: 95%; max-width: 1000px; padding: 12px 0;
      display: flex; flex-wrap: wrap; align-items: center; gap: 12px;
    }
    .logo {
      display: flex; align-items: center; gap: 8px; color: var(--primary);
      flex: 1 0 auto; margin-right: auto;
    }
    .header-actions {
      flex: 0 0 auto;
      display: flex; flex-direction: row; flex-wrap: nowrap; align-items: center; gap: 8px;
    }
    .tabs {
      display: flex; background: transparent; padding: 0; gap: 8px;
      order: 3; width: 100%; overflow-x: auto; margin-top: 4px;
      justify-content: flex-start;
      -webkit-overflow-scrolling: touch; scrollbar-width: none;
    }
    .tab-btn {
      padding: 8px 16px; border: 1px solid transparent; border-radius: 99px; cursor: pointer;
      font-weight: 600; font-size: 13px; color: var(--muted); background: transparent;
      transition: 0.2s; white-space: nowrap; flex: 0 0 auto;
    }
    .tab-btn.active { background: var(--input-bg); color: var(--text); border-color: var(--border); }

    .main-content { width: 95%; max-width: 800px; margin: 0 auto; padding: 24px 0; position: relative; z-index: 1; }
    .card { background: var(--card); border-radius: 16px; border: 1px solid var(--border); padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    
    /* Inputs */
    .input-field, .textarea-field {
      width: 100%; padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border);
      background: var(--input-bg); color: var(--text); outline: none;
      transition: 0.2s; font-family: inherit; font-size: 15px;
    }
    .input-field:focus, .textarea-field:focus { border-color: var(--primary); ring: 2px solid var(--primary); }
    
    /* Buttons */
    .btn-action { 
      background: var(--primary); color: white; border: none; 
      padding: 12px 24px; border-radius: 8px; cursor: pointer; 
      font-weight: 600; display: flex; align-items: center; gap: 8px; 
      transition: 0.2s; justify-content: center; font-size: 14px; 
    }
    .btn-action:hover { opacity: 0.9; transform: translateY(-1px); }
    .btn-action:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-sm { padding: 8px 16px; font-size: 12px; height: auto; }
    
    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .modal-card { 
      background: var(--header); 
      width: 100%; max-width: 360px; 
      border-radius: 16px; padding: 32px; 
      position: relative; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); 
      border: 1px solid var(--border);
    }

    /* Independent Modal Styles (No conflicts) */
    .modal-input { 
      width: 100%;
      padding: 8px 12px; /* Decreased internal padding */
      font-size: 14px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--input-bg);
      color: var(--text);
      outline: none;
      transition: 0.2s;
      margin: 0; /* Reset margins */
    }
    .modal-input:focus { border-color: var(--primary); background: var(--card); }

    .modal-btn { 
      width: 100%;
      background: var(--primary); color: white; border: none; 
      padding: 10px; /* Decreased internal padding */
      border-radius: 8px; cursor: pointer; 
      font-weight: 600; display: flex; align-items: center; justify-content: center;
      gap: 8px; transition: 0.2s; font-size: 14px;
    }
    .modal-btn:hover { opacity: 0.9; }

    .auth-badge { display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: var(--input-bg); border: 1px solid var(--border); border-radius: 99px; cursor: pointer; transition: 0.2s; }
    .auth-badge:hover { background: var(--border); }
    
    .recipe-item { cursor: pointer; border-bottom: 1px solid var(--border); padding: 24px 0; }
    .match-tag { font-size: 12px; font-weight: 700; padding: 4px 8px; border-radius: 4px; background: rgba(34, 197, 94, 0.1); color: #22c55e; }
    
    .pantry-subtabs { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 12px; margin-bottom: 16px; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
    .pantry-subtab { padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap; border: 1px solid var(--border); background: var(--bg); color: var(--muted); transition: 0.2s; }
    .pantry-subtab.active { background: var(--primary); color: white; border-color: var(--primary); }

    /* Columns */
    .columns-container { display: grid; grid-template-columns: 1fr; gap: 16px; }
    .column {
      background: var(--input-bg); border-radius: 12px; padding: 16px;
      border: 1px solid var(--border);
      display: flex; flex-wrap: wrap; gap: 8px; align-content: flex-start;
    }
    .column-header {
      font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--muted);
      text-align: center; margin-bottom: 12px; letter-spacing: 0.05em; width: 100%;
    }

    .ingredient-bubble {
      font-size: 13px; padding: 6px 12px;
      background: var(--card); border: 1px solid var(--border); border-radius: 99px;
      cursor: pointer; color: var(--text);
      font-weight: 500; text-align: center; transition: 0.2s;
      position: relative; user-select: none; margin: 0;
    }
    .ingredient-bubble:hover { border-color: var(--primary); color: var(--primary); }
    .ingredient-bubble.custom { background: ${activeColors.tint}; border-color: transparent; color: var(--primary-dark); }

    .delete-btn {
      position: absolute; top: -6px; right: -6px;
      background: #ef4444; color: white; border-radius: 50%;
      width: 18px; height: 18px;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; cursor: pointer;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      z-index: 10;
    }

    .modal-actions { display: flex; gap: 12px; margin-top: 16px; width: 100%; }
    .modal-btn-action { flex: 1; border: none; padding: 10px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; }
    .bg-red { background: #ef4444; color: white; }
    .bg-gray { background: #64748b; color: white; }

    .whitespace-pre-wrap { white-space: pre-wrap; word-wrap: break-word; }
    /* Auto-expanding logic is handled by component now */

    .bubble-input {
      font-size: 13px; padding: 6px 12px; border-radius: 99px;
      border: 1px solid var(--border); background: var(--input-bg);
      outline: none; width: 160px; color: var(--text); transition: 0.2s; height: 32px;
    }
    .bubble-input:focus { border-color: var(--primary); background: var(--card); }
    .bubble-btn { width: 32px; height: 32px; padding: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--primary); color: white; border: none; cursor: pointer; }

    .pantry-add-container { display: flex; justify-content: center; margin-top: 16px; width: 100%; }
    .pantry-add-form { display: flex; align-items: center; gap: 8px; }
    .user-avatar { width: 24px; height: 24px; border-radius: 50%; object-fit: cover; }

    .color-toggle {
      width: 20px; height: 20px; border-radius: 50%; cursor: pointer; border: 1px solid var(--border);
      background: linear-gradient(135deg, #fb923c 50%, #38bdf8 50%);
    }
    .theme-toggle {
      padding: 6px; border-radius: 50%; background: transparent; border: none;
      cursor: pointer; color: var(--muted); display: flex; align-items: center; justify-content: center;
    }
    .theme-toggle:hover { color: var(--text); background: var(--input-bg); }

    /* New Import Styles */
    .import-option {
      background: var(--input-bg); border: 1px solid var(--border);
      border-radius: 12px; padding: 20px; text-align: center;
      transition: 0.2s; cursor: pointer;
    }
    .import-option:hover { border-color: var(--primary); transform: translateY(-2px); }
    .hidden-file-input { display: none; }

    /* Small Delete Icon Button Style */
    .btn-icon-sm {
        width: 32px; height: 32px;
        padding: 0;
        display: flex; align-items: center; justify-content: center;
        border-radius: 8px; border: none; cursor: pointer;
    }

    /* Flex Utilities for non-Tailwind setups */
    .edit-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 12px;
      width: 100%;
    }
    .edit-group {
      display: flex;
      gap: 8px;
    }
    .btn-mini {
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      border: none;
      display: flex; align-items: center;
    }

    /* Explicit Color Classes */
    .bg-red-500 { background-color: #ef4444; color: white; }
    .bg-slate-500 { background-color: #64748b; color: white; }
    .bg-green-600 { background-color: #16a34a; color: white; }

    /* Full Window Styles */
    .full-window-overlay {
      position: fixed; inset: 0; z-index: 2000;
      background-color: #f3f4f6; /* Light Grey */
      color: #000000;
      display: flex; flex-direction: column;
    }
    .dark .full-window-overlay {
      background-color: #4e342e; /* Brown */
      color: #ffffff;
    }
    .fw-header {
      flex: 0 0 auto;
      display: flex; justify-content: space-between; align-items: center;
      padding: 6px 12px; /* Much smaller */
      border-bottom: 1px solid var(--border);
      background-color: var(--header); 
      /* "header colors are okay as they are" so we keep var(--header) */
    }
    .fw-body {
      flex: 1 1 auto;
      display: flex;
      overflow: hidden;
      position: relative;
    }
    .fw-col {
      overflow-y: auto;
      padding: 32px;
      height: 100%;
      font-size: 24px; /* 18pt */
    }
    .fw-item {
        margin-bottom: 24px; /* Larger line spacing */
        line-height: 1.5;
    }
    .fw-resizer {
      width: 12px;
      cursor: col-resize;
      background-color: var(--border);
      flex: 0 0 auto;
      transition: background 0.2s;
      display: flex; align-items: center; justify-content: center;
    }
    .fw-resizer:hover, .fw-resizer:active {
      background-color: var(--primary);
    }
    .fw-resizer::after {
      content: '⋮'; color: var(--muted); font-size: 14px;
    }

    /* Fixed Image Bottom Right */
    .bg-bottom-right {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 250px;
      height: auto;
      z-index: -5;
      opacity: 0.8;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      pointer-events: none;
    }
    @media (max-width: 768px) {
        .bg-bottom-right {
            width: 150px;
            bottom: 10px;
            right: 10px;
            opacity: 0.5;
        }
    }

    @media (min-width: 640px) {
      .columns-container { grid-template-columns: 1fr 1fr 1fr; }
      .header-content { flex-wrap: nowrap; padding: 16px 0; }
      .header-actions { margin-left: auto; }
      .logo { font-size: 24px; flex: 0 0 auto; margin-right: 0; }
      .tabs { order: 0; width: auto; margin-top: 0; justify-content: center; }
      .column { min-height: 300px; display: block; }
      .ingredient-bubble { display: inline-block; margin-right: 6px; margin-bottom: 6px; }
      .pantry-add-container { justify-content: flex-end; }
    }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, [theme, colorTheme]);

  useEffect(() => {
    localStorage.setItem('rm_theme_v143', theme);
    document.documentElement.className = theme;
  }, [theme]);

  // Persist Color Theme
  useEffect(() => {
    localStorage.setItem('rm_color_theme', colorTheme);
  }, [colorTheme]);

  // Unified Session Management
  useEffect(() => {
    let isMounted = true;
    const safetyTimeout = setTimeout(() => {
      if (isMounted && isLoading) setIsLoading(false);
    }, 3500);

      const initAuth = async () => {
        if (fb.initError) return;
        if (fb.isDummyConfig) {
          setUser({ uid: 'offline-guest', isAnonymous: true, displayName: 'Guest' });
          setIsLoading(false);
          return;
        }
      };

      if (!fb.initError) {
        initAuth();
        if (!fb.isDummyConfig) {
          const unsubscribe = onAuthStateChanged(fb.auth, async (usr) => {
            if (!isMounted) return;
            if (usr) {
              setUser(usr);
              addLog(`Session OK: ${usr.uid.substring(0, 5)}`);
            } else {
              if (!isAutoLoginAttempted.current) {
                isAutoLoginAttempted.current = true;
                try {
                  if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(fb.auth, __initial_auth_token);
                  } else {
                    await signInAnonymously(fb.auth);
                  }
                } catch (e) {
                  setIsLoading(false);
                }
              } else {
                setIsLoading(false);
              }
            }
          });
          return () => { isMounted = false; unsubscribe(); clearTimeout(safetyTimeout); };
        }
      } else {
        setIsLoading(false);
      }
  }, []);

  // Database Connection
  useEffect(() => {
    if (!user || fb.initError) return;
    const safeUid = user.uid; // Use direct UID to prevent permission mismatch
    const recipesRef = collection(fb.db, 'artifacts', appId, 'users', safeUid, 'recipes');
    const pantryRef = collection(fb.db, 'artifacts', appId, 'users', safeUid, 'pantry');

    addLog(`Syncing ${safeUid.substring(0,5)}...`);

    const unsubR = onSnapshot(recipesRef, (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setRecipes(data);
      // Enhanced logging for diagnostics
      const source = s.metadata.fromCache ? 'Cache' : 'Server';
      addLog(`Fetched ${data.length} recipes [${source}]`);
    }, (err) => { addLog(`R-Error: ${err.code}`); setRecipes([]); });

    const unsubP = onSnapshot(pantryRef, (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setPantry(data);
      const source = s.metadata.fromCache ? 'Cache' : 'Server';
      addLog(`Fetched ${data.length} items [${source}]`);
    }, (err) => { addLog(`P-Error: ${err.code}`); setPantry([]); });

    return () => { unsubR(); unsubP(); };
  }, [user?.uid]);

  useEffect(() => {
    if (user && recipes !== null && pantry !== null) setIsLoading(false);
  }, [user, recipes, pantry]);

    // Drag and Drop
    const handleDragStart = (e, name) => e.dataTransfer.setData("text/plain", name);
    const handleDragOver = (e) => e.preventDefault();
    const handleDrop = async (e, targetStatus) => {
      e.preventDefault();
      const name = e.dataTransfer.getData("text/plain");
      if (!name || !user) return;

      // Check if item already exists in DB
      const existing = (pantry || []).find(p => p.name.toLowerCase() === name.toLowerCase());
      const safeUid = user.uid;

      try {
        if (existing) {
          await updateDoc(doc(fb.db, 'artifacts', appId, 'users', safeUid, 'pantry', existing.id), { status: targetStatus });
        } else {
          await addDoc(collection(fb.db, 'artifacts', appId, 'users', safeUid, 'pantry'), {
            name: name,
            category: activePantryCategory,
            status: targetStatus,
            available: targetStatus === 'have'
          });
        }
        addLog(`Updated: ${name}`);
      } catch (e) { addLog(`DB Error: ${e.message}`); }
    };

    const handlePantryAdd = async (e) => {
      e.preventDefault();
      const val = newItem.trim();
      if (!val || !user) return;

      // Check duplicates in Master List
      const valLower = val.toLowerCase();
      let isMaster = false;
      let masterCat = '';
      Object.keys(MASTER_INGREDIENTS).forEach(cat => {
        if (MASTER_INGREDIENTS[cat].some(i => i.toLowerCase() === valLower)) {
          isMaster = true;
          masterCat = cat;
        }
      });

      if (isMaster) {
        alert(`"${val}" is already a standard ingredient in the "${masterCat}" category.`);
        return;
      }

      // Check duplicates in custom/DB items
      const existingCustom = (pantry || []).find(p => p.name.toLowerCase() === valLower);
      if (existingCustom) {
        alert(`"${val}" is already in your pantry.`);
        return;
      }

      // OPTIMISTIC UPDATE: Clear input immediately
      setNewItem('');

      try {
        await addDoc(collection(fb.db, 'artifacts', appId, 'users', user.uid, 'pantry'), {
          name: toTitleCase(val),
                     category: activePantryCategory,
                     status: 'have',
                     available: true
        });
        addLog(`Added: ${val}`);
      } catch (e) {
        // If error, maybe restore input? Or just log.
        addLog(`Error: ${e.message}`);
      }
    };

    const requestDelete = (e, item) => {
      e.stopPropagation(); // Stop bubble click event
      setDeleteConfirmation({ id: item.id, name: item.name, collection: 'pantry' });
    };

    const confirmDelete = async () => {
      if (!deleteConfirmation || !user) return;

      // OPTIMISTIC UPDATE: Close modal immediately
      const { id, collection: colName } = deleteConfirmation;
      setDeleteConfirmation(null);

      try {
        await deleteDoc(doc(fb.db, 'artifacts', appId, 'users', user.uid, colName, id));
        addLog("Item deleted.");
      } catch (e) {
        addLog(`Delete Error: ${e.message}`);
      }
    };

    // Status Cycling for Mobile (Tap to Move)
    const cycleStatus = async (name, currentStatus) => {
      if (!user) return;

      const statuses = ['have', 'dont_have', 'seldom'];
      const nextStatusIndex = (statuses.indexOf(currentStatus) + 1) % statuses.length;
      const nextStatus = statuses[nextStatusIndex];

      const existing = (pantry || []).find(p => p.name.toLowerCase() === name.toLowerCase());
      const safeUid = user.uid;

      try {
        if (existing) {
          await updateDoc(doc(fb.db, 'artifacts', appId, 'users', safeUid, 'pantry', existing.id), { status: nextStatus });
        } else {
          await addDoc(collection(fb.db, 'artifacts', appId, 'users', safeUid, 'pantry'), {
            name: name,
            category: activePantryCategory,
            status: nextStatus,
            available: nextStatus === 'have'
          });
        }
        addLog(`${name} -> ${nextStatus}`);
      } catch (e) { addLog(`Move Error: ${e.message}`); }
    };

    const renderColumn = (statusKey, title) => {
      const ingredients = MASTER_INGREDIENTS[activePantryCategory] || [];

      // Master items in this column
      const masterItemsInColumn = ingredients.filter(name => {
        const pItem = (pantry || []).find(p => p.name.toLowerCase() === name.toLowerCase());
        const status = pItem?.status;
        // Default: 'have'
        if (!pItem) return statusKey === 'have';
        return status === statusKey;
      }).map(name => ({ name, isCustom: false }));

      // Custom items in this column
      const customItemsInColumn = (pantry || []).filter(p => {
        if (p.category !== activePantryCategory) return false;
        const isMaster = ingredients.some(m => m.toLowerCase() === p.name.toLowerCase());
        if (isMaster) return false; // Already handled above

        const status = p.status || 'have';
        return status === statusKey;
      }).map(p => ({ name: p.name, isCustom: true, id: p.id }));

      // Combine and Sort Alphabetically
      const allItemsInColumn = [...masterItemsInColumn, ...customItemsInColumn].sort((a, b) =>
      a.name.localeCompare(b.name)
      );

      return (
        <div className="column" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, statusKey)}>
        <div className="column-header">{title}</div>
        {allItemsInColumn.map(item => (
          <div
          key={item.name}
          className={`ingredient-bubble ${item.isCustom ? 'custom' : ''}`}
          draggable
          onDragStart={(e) => handleDragStart(e, item.name)}
          onClick={() => cycleStatus(item.name, statusKey)}
          >
          {item.name}
          {item.isCustom && (
            <div className="delete-btn" onClick={(e) => requestDelete(e, item)}><X size={10}/></div>
          )}
          </div>
        ))}
        </div>
      );
    };

    // --- Recipe Editing ---
    const handleEditRecipe = (recipe) => {
      setEditingRecipeId(recipe.id);
      setEditRecipeForm({
        name: recipe.name,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions
      });
    };

    const saveEditedRecipe = async () => {
      if (!editingRecipeId || !user) return;
      try {
        // Race updateDoc against a 5s timeout
        const updatePromise = updateDoc(doc(fb.db, 'artifacts', appId, 'users', user.uid, 'recipes', editingRecipeId), {
          name: editRecipeForm.name,
          ingredients: editRecipeForm.ingredients,
          instructions: editRecipeForm.instructions
        });

        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Update timeout")), 5000));

        await Promise.race([updatePromise, timeoutPromise]);
        
        setEditingRecipeId(null);
        addLog("Recipe updated.");
      } catch (e) {
        if (e.message === "Update timeout") {
           addLog("Update queued (offline/timeout).");
           setEditingRecipeId(null); // Close on timeout assumption
        } else {
           addLog(`Update failed: ${e.message}`);
        }
      }
    };

    // --- AI & IMPORT FEATURES ---

    // 1. Text Parsing (Local)
    const handleLocalParse = () => {
      if (!rawTextImport.trim()) return;
      addLog("Parsing text locally...");
      const lines = rawTextImport.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      if (lines.length < 2) {
        addLog("Not enough text found.");
        return;
      }

      const title = lines[0];
      const ingredients = [];
      const instructions = [];
      let isInst = false;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/(instruction|step|method|direction)/i)) {
          isInst = true;
          continue;
        }
        if (line.match(/(ingredient|items|need)/i)) {
          isInst = false;
          continue;
        }

        if (isInst) instructions.push(line);
        else ingredients.push(line);
      }

      setManual({
        name: title,
        ings: ingredients.join('\n'),
        inst: instructions.join('\n'),
        source: "Manual Text Import"
      });
      setRawTextImport('');
      addLog("Text parsed successfully.");
    };
    // 2. Image Analysis (Gemini Vision via Vercel Backend)
    const getRecipeFromImage = async (base64Data) => {
      // 1. Log Start
      addLog("Sending image to secure backend...");
      addLog(`Image Size: ${(base64Data.length * 0.75 / 1024).toFixed(2)} KB`);

      const prompt = `Extract the recipe from this image. Return valid JSON with these keys: "name" (string), "ingredients" (single string with newlines), "instructions" (single string with newlines). If no recipe is found, return null.`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s Timeout

      try {
        let response;
        if (testApiKey) {
          // DIRECT CALL (For Preview Testing)
          addLog("Using TEST KEY (Client-Side)...");
          response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${testApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  role: "user",
                  parts: [
                    { text: prompt },
                    { inlineData: { mimeType: "image/jpeg", data: base64Data } }
                  ]
                }]
              }),
              signal: controller.signal
            }
          );
        } else {
          // PROXY CALL (For Production)
          response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: prompt,
              base64Data: base64Data
            }),
            signal: controller.signal
          });
        }
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          // Enhanced Error Logging
          const status = response.status;
          let details = response.statusText;
          
          try {
            // Try reading JSON error first (clone to not consume body)
            const errorJson = await response.clone().json();
            if (errorJson.error) details = typeof errorJson.error === 'object' ? JSON.stringify(errorJson.error) : errorJson.error;
          } catch (e) {
            // Fallback to text (e.g. for 404/500 HTML pages)
            try {
              const text = await response.text();
              // Remove HTML tags for cleaner logs if it's a default 404 page
              const cleanText = text.replace(/<[^>]*>?/gm, '').substring(0, 100);
              details = cleanText.length > 0 ? cleanText : details;
            } catch (e2) {}
          }

          addLog(`Backend Error [${status}]: ${details}`);
          if (!testApiKey && (status === 404 || status === 405)) {
            // Trigger UI Alert for Missing Backend
            alert("Backend Not Found! \n\nSince you are in Preview Mode, you must enter a 'Test API Key' below to make this work.");
          }
          return null;
        }

        const data = await response.json();
        
        // 2. Log Raw Response
        if (data?.error) {
          addLog(`API Error: ${data.error.message}`);
          return null;
        }

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (text) {
          addLog("Received text from AI. Parsing...");
          try {
            const json = parseAndSanitizeAIJSON(text);
            return {
              name: typeof json.name === 'string' ? json.name : "Scanned Recipe",
              ingredients: Array.isArray(json.ingredients) ? json.ingredients.join('\n') : (typeof json.ingredients === 'string' ? json.ingredients : ""),
              instructions: Array.isArray(json.instructions) ? json.instructions.join('\n') : (typeof json.instructions === 'string' ? json.instructions : "")
            };
          } catch (e) {
            addLog("JSON Parse Error: " + e.message);
            // addLog("Raw Text: " + text.substring(0, 100) + "...");
            return null;
          }
        }
        addLog("No text returned from AI.");
        return null;

      } catch (e) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') {
             addLog("Request timed out (30s).");
        } else {
             addLog("Network/Server Error: " + e.message);
        }
        return null;
      }
    };

    const handleImageSelect = async (e) => {
      const files = Array.from(e.target.files);
      // Reset input value so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      if (!files.length) return;

      if (files.length === 1) {
        // Single File - Load into Editor (Existing Logic)
        const reader = new FileReader();
        // Add error handling to single file reader
        reader.onerror = () => {
             addLog("Error reading file");
             setIsAnalyzing(false);
        };
        reader.onloadend = async () => {
          setIsAnalyzing(true);
          try {
            const data = await getRecipeFromImage(reader.result.split(',')[1]);
            if (data) {
              setManual({
                name: data.name,
                ings: data.ingredients,
                inst: data.instructions,
                source: "AI Photo Scan"
              });
              addLog("Photo analysis complete!");
            }
          } catch(err) {
            addLog("Error analyzing photo.");
          } finally {
            setIsAnalyzing(false);
          }
        };
        reader.readAsDataURL(files[0]);
      } else {
        // BATCH MODE - Save directly to DB
        setBatchProgress({ current: 0, total: files.length });
        setIsAnalyzing(true);
        
        // Make a stable copy of files to avoid closure issues
        const filesToProcess = [...files];

        for (let i = 0; i < filesToProcess.length; i++) {
          setBatchProgress({ current: i + 1, total: filesToProcess.length });
          addLog(`Processing file ${i + 1} of ${filesToProcess.length}...`);
          try {
            const base64 = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result.split(',')[1]);
              reader.onerror = reject;
              reader.readAsDataURL(filesToProcess[i]);
            });
            
            // Add slight delay to prevent rate limits
            if(i > 0) await new Promise(r => setTimeout(r, 1000));

            const recipeData = await getRecipeFromImage(base64);
            
            if (recipeData) {
               addLog(`AI processed. Saving ${recipeData.name}...`); // Debug log

               // Race addDoc against a 5s timeout to prevent hanging
               const savePromise = addDoc(collection(fb.db, 'artifacts', appId, 'users', user.uid, 'recipes'), {
                name: recipeData.name,
                ingredients: recipeData.ingredients,
                instructions: recipeData.instructions,
                source: "AI Batch Scan",
                createdAt: Date.now()
              });

              const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Save timeout")), 5000));

              try {
                await Promise.race([savePromise, timeoutPromise]);
                addLog(`Saved: ${recipeData.name}`);
              } catch (saveErr) {
                 // If it times out or fails, we assume it might have queued locally or failed.
                 // We log and continue so the batch doesn't die.
                 addLog(`Save warning: ${saveErr.message} (might be queued offline)`);
              }
            } else {
              addLog(`Failed: File ${i + 1} returned no data.`);
            }
          } catch (e) {
            addLog(`Batch Error (File ${i+1}): ${e.message}`);
          }
        }
        setIsAnalyzing(false);
        setBatchProgress({ current: 0, total: 0 });
        addLog("Batch import complete.");
        setTimeout(() => setActiveTab('recipes'), 1000); // Redirect to recipes after 1s
      }
    };

    const resetManualForm = () => {
        setManual({ name: '', ings: '', inst: '', source: '' });
    };

    const manualSaveNewRecipe = async () => {
      if (!manual.name || !user) return;
      setIsImporting(true);
      const recipePayload = {
        name: manual.name,
        ingredients: manual.ings,
        instructions: manual.inst,
        source: manual.source,
        createdAt: Date.now()
      };

      try {
        addLog(`Saving to users/${user.uid}/recipes`);
        await addDoc(collection(fb.db, 'artifacts', appId, 'users', user.uid, 'recipes'), recipePayload);

        // Reset form ONLY on success
        resetManualForm();
        setScrapeUrl('');
        setActiveTab('recipes');
        addLog("Recipe Saved.");
      } catch (e) {
        addLog(`Save Error: ${e.message}`);
      }
      setIsImporting(false);
    };

    // Auth Handlers
    const handleGoogleLogin = async () => {
      setIsAuthLoading(true);
      if (fb.isDummyConfig) { setIsAuthLoading(false); return; }
      try { await signInWithPopup(fb.auth, fb.googleProvider); setIsAuthOpen(false); }
      catch (e) { setAuthError(e.message); } finally { setIsAuthLoading(false); }
    };
    const handleEmailAuth = async (e) => {
      e.preventDefault();
      setIsAuthLoading(true);
      if (fb.isDummyConfig) { setIsAuthLoading(false); return; }
      try {
        if (authMode === 'signup') {
          const res = await createUserWithEmailAndPassword(fb.auth, authForm.email, authForm.password);
          await updateProfile(res.user, { displayName: authForm.name });
        } else {
          await signInWithEmailAndPassword(fb.auth, authForm.email, authForm.password);
        }
        setIsAuthOpen(false);
      } catch (e) { setAuthError(e.message); } finally { setIsAuthLoading(false); }
    };
    const handleSignOut = async () => {
      try { if (!fb.isDummyConfig) await signOut(fb.auth); window.location.reload(); }
      catch (e) { addLog(e.message); }
    };

    // Manual Reconnect for Mobile Debugging
    const handleReconnect = async () => {
      try {
        await disableNetwork(fb.db);
        await new Promise(r => setTimeout(r, 500));
        await enableNetwork(fb.db);
        addLog("Reconnected to database.");
      } catch (e) {
        addLog("Reconnect failed: " + e.message);
      }
    };

    if (isLoading) return <div className="app-container dark" style={{justifyContent:'center', display:'flex', alignItems:'center'}}><Loader2 className="animate-spin text-orange-500 mx-auto mb-4" size={56}/></div>;

    return (
      <div className={`app-container ${theme}`}>
      <div className="fixed-background"></div>
      {/* Background Image */}
      <img src="/mechef.png" alt="" className="bg-bottom-right" />

      {/* Full Window Recipe View */}
      {fullScreenRecipe && (
        <div className={`full-window-overlay ${theme === 'dark' ? 'dark' : ''}`}>
          <div className="fw-header">
            <h2 className="text-xl font-bold text-primary">{fullScreenRecipe.name}</h2>
            <button 
              onClick={() => setFullScreenRecipe(null)} 
              className="btn-mini bg-slate-500 text-white hover:bg-slate-600 !p-2"
            >
              <X size={18}/>
            </button>
          </div>
          <div 
            className="fw-body" 
            onMouseMove={handleResize} 
            onMouseUp={stopResizing} 
            onMouseLeave={stopResizing}
          >
            {/* Ingredients Column (Left) */}
            <div className="fw-col border-r border-border" style={{ width: `${splitRatio}%` }}>
              <h3 className="text-lg font-bold mb-4 text-primary uppercase tracking-wide">Ingredients</h3>
              <div className="fw-list">
                {(fullScreenRecipe.ingredients || "").split('\n').map((line, idx) => (
                  <div key={idx} className="fw-item flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-3 flex-shrink-0" />
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Resizer Handle */}
            <div className="fw-resizer" onMouseDown={startResizing}></div>

            {/* Instructions Column (Right) */}
            <div className="fw-col flex-1">
              <h3 className="text-lg font-bold mb-4 text-primary uppercase tracking-wide">Instructions</h3>
              <div className="fw-list">
                {(fullScreenRecipe.instructions || "").split('\n').map((step, idx) => (
                  <div key={idx} className="fw-item flex gap-3">
                    <span className="flex-shrink-0 text-primary font-bold text-xl leading-none mt-1 select-none">
                      *
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteConfirmation && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmation(null)}>
        <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-2">Delete {deleteConfirmation.collection === 'recipes' ? 'Recipe' : 'Ingredient'}?</h2>
        <p className="text-sm text-muted mb-6">Permanently remove "{String(deleteConfirmation.name)}"?</p>
        <div className="modal-actions">
        <button className="modal-btn-action bg-red" onClick={confirmDelete}>Delete</button>
        <button className="modal-btn-action bg-gray" onClick={() => setDeleteConfirmation(null)}>Cancel</button>
        </div>
        </div>
        </div>
      )}

      {/* Auth Modal */}
      {isAuthOpen && (
        <div className="modal-overlay" onClick={() => setIsAuthOpen(false)}>
        <div className="modal-card" onClick={e => e.stopPropagation()}>
          <button className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 transition-colors text-muted" onClick={() => setIsAuthOpen(false)}><X size={18}/></button>
          
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-primary tracking-tight">RECIPE MATCH</h2>
            <p className="text-sm text-muted mt-1">Sign in to sync your pantry</p>
          </div>

          <form onSubmit={handleEmailAuth} className="w-full flex flex-col gap-6">
            {authMode === 'signup' && (
               <input 
                 className="modal-input" 
                 placeholder="Name" 
                 required 
                 value={authForm.name} 
                 onChange={e => setAuthForm({...authForm, name: e.target.value})}
               />
            )}
            <input 
              className="modal-input" 
              type="email" 
              placeholder="Email" 
              required 
              value={authForm.email} 
              onChange={e => setAuthForm({...authForm, email: e.target.value})}
            />
            <input 
              className="modal-input" 
              type="password" 
              placeholder="Password" 
              required 
              value={authForm.password} 
              onChange={e => setAuthForm({...authForm, password: e.target.value})}
            />
            
            <button 
              className="modal-btn mt-4" 
              type="submit" 
              disabled={isAuthLoading}
            >
              {isAuthLoading ? <Loader2 className="animate-spin" size={16}/> : (authMode === 'login' ? 'Log In' : 'Sign Up')}
            </button>
          </form>

          <div className="w-full flex items-center gap-3 my-4">
             <div className="h-px bg-border flex-1"></div>
             <span className="text-[10px] text-muted font-bold uppercase">Or</span>
             <div className="h-px bg-border flex-1"></div>
          </div>

          <button 
            className="modal-btn" 
            style={{background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)'}} 
            onClick={handleGoogleLogin}
          >
            Google Sign In
          </button>

          <div className="mt-4 text-center">
             <button 
               className="text-sm text-muted hover:text-primary font-medium"
               onClick={() => setAuthMode(m => m === 'login' ? 'signup' : 'login')}
             >
               {authMode === 'login' ? "New? Create an account" : "Have an account? Log in"}
             </button>
          </div>

        </div>
        </div>
      )}

      <header className="header">
      <div className="header-content">
      {/* Removed title text, kept icon */}
      <div className="logo"><ChefHat size={28} strokeWidth={2.5}/></div>
      <nav className="tabs">
      {['recipes','pantry','import', 'logs'].map(id => <button key={id} onClick={() => setActiveTab(id)} className={`tab-btn ${activeTab === id ? 'active' : ''}`}>{id}</button>)}
      </nav>
      <div className="header-actions flex items-center gap-2">
      <button className="color-toggle" onClick={() => setColorTheme(t => t === 'orange' ? 'blue' : 'orange')}></button>
      <button className="theme-toggle" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
      {theme === 'light' ? <Moon size={20}/> : <Sun size={20}/>}
      </button>
      <div className="auth-badge" onClick={() => (!user || user.isAnonymous) ? setIsAuthOpen(true) : handleSignOut()}>
      {(!user || user.isAnonymous || !user.photoURL)
        ? <User size={18}/>
        : <img src={user.photoURL} className="user-avatar" alt="User" />
      }
      <span className="text-xs font-bold">
      {(!user || user.isAnonymous) ? 'Sign In' : (user.displayName || 'Member')}
      </span>
      </div>
      </div>
      </div>
      </header>

      <main className="main-content">
      {activeTab === 'pantry' && (
        <div className="card">
        {/* Tabs at Top */}
        <div className="pantry-subtabs">
        {CATEGORY_TABS.map(cat => <button key={cat} onClick={() => setActivePantryCategory(cat)} className={`pantry-subtab ${activePantryCategory === cat ? 'active' : ''}`}>{cat}</button>)}
        </div>

        <div className="columns-container">
        {renderColumn('have', "Have")}
        {renderColumn('dont_have', "Don't Have")}
        {renderColumn('seldom', "Seldom Stocked")}
        </div>

        <div className="text-[10px] text-muted text-center mt-4 mb-2">Drag to move items.</div>

        {/* Input Moved to Bottom Right */}
        <div className="pantry-add-container">
        <form onSubmit={handlePantryAdd} className="pantry-add-form">
        <input
        className="bubble-input"
        placeholder={`+ Add ${activePantryCategory.toLowerCase()}`}
        value={newItem}
        onChange={e => setNewItem(e.target.value)}
        />
        <button type="submit" className="bubble-btn"><Plus size={12}/></button>
        </form>
        </div>
        </div>
      )}

      {activeTab === 'recipes' && (
        <div className="card">
          {/* New Title Block */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-primary tracking-tight">RECIPE MATCH</h1>
            <p className="text-xs text-muted font-mono">v2.9.16</p>
          </div>
        <div className="flex gap-4 mb-6"><Search size={20} className="text-muted"/><input className="input-field" style={{border:'none',background:'none',padding:0}} placeholder="Search recipes..." value={search} onChange={e => setSearch(e.target.value)}/></div>
        <div className="divide-y divide-border/50">
        {(scoredRecipes || []).map(recipe => {
          const isEditing = editingRecipeId === recipe.id;
          return (
            <div key={recipe.id} className="recipe-item">
            {isEditing ? (
              <div className="space-y-3 p-2">
              <input className="input-field" value={editRecipeForm.name} onChange={e => setEditRecipeForm({...editRecipeForm, name: e.target.value})} />
              {/* Auto-expanding Textareas */}
              <AutoTextarea
                className="textarea-field"
                value={editRecipeForm.ingredients}
                onChange={e => setEditRecipeForm({...editRecipeForm, ingredients: e.target.value})}
                placeholder="Ingredients"
              />
              <AutoTextarea
                className="textarea-field"
                value={editRecipeForm.instructions}
                onChange={e => setEditRecipeForm({...editRecipeForm, instructions: e.target.value})}
                placeholder="Instructions"
              />
              <div className="edit-row">
                <button className="btn-icon-sm bg-red-500 hover:bg-red-600" onClick={() => setDeleteConfirmation({ id: recipe.id, name: recipe.name, collection: 'recipes' })} title="Delete Recipe"><Trash2 size={16} color="white"/></button>
                <div className="edit-group">
                  <button className="btn-mini bg-slate-500 hover:bg-slate-600" onClick={() => setEditingRecipeId(null)}>Cancel</button>
                  <button className="btn-mini bg-green-600 hover:bg-green-700" onClick={saveEditedRecipe}>Save</button>
                </div>
              </div>
              </div>
            ) : (
              <div onClick={() => setExpandedId(expandedId === recipe.id ? null : recipe.id)}>
              <div className="flex justify-between font-bold items-center">
              <div className="flex gap-3 items-center">
              <span>{recipe.name}</span>
              {expandedId === recipe.id && <button onClick={(e) => { e.stopPropagation(); handleEditRecipe(recipe); }} className="p-1 bg-slate-100 rounded hover:bg-orange-100 text-slate-400 hover:text-orange-500"><Edit2 size={14}/></button>}
              </div>
              <div className="flex gap-2 items-center">
                  <div className="match-tag">{recipe.percent}%</div>
                  <button className="btn-mini p-1.5" onClick={(e) => { e.stopPropagation(); setFullScreenRecipe(recipe); }} title="Full Window View">
                    <Maximize2 size={14} />
                  </button>
              </div>
              </div>
              {expandedId === recipe.id && <div className="mt-4 text-sm text-muted bg-slate-50 dark:bg-slate-900/40 p-6 rounded-xl border border-border">
                <div className="mb-4">
                <strong className="text-primary block mb-2">Ingredients:</strong>
                <div className="space-y-1">
                {/* Safer mapping that handles potentially missing/malformed data */}
                {(recipe.ingredients || "").split('\n').map((line, idx) => {
                  const trimmed = line.trim();
                  if(!trimmed) return null;
                  const isMatch = isIngredientAvailable(trimmed, availableIngredients);
                  return (
                    <div key={idx} className="flex items-start gap-2">
                    {isMatch ? <CheckCircle size={14} className="text-green-500 mt-0.5 shrink-0"/> : <X size={14} className="text-red-500 mt-0.5 shrink-0"/>}
                    <span className={isMatch ? "text-slate-700 dark:text-slate-200" : "text-slate-400"}>{trimmed}</span>
                    </div>
                  );
                })}
                </div>
                </div>
                <div>
                <strong className="text-primary block mb-2">Instructions:</strong>
                <pre className="whitespace-pre-wrap font-sans">{recipe.instructions || "No instructions provided."}</pre>
                </div>
                </div>}
                </div>
            )}
            </div>
          )})}
          </div>
          </div>
      )}

      {activeTab === 'import' && (
        <div className="space-y-4">
        
        {/* NEW: Import Options Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="import-option" onClick={() => fileInputRef.current?.click()}>
            {/* Added "multiple" attribute here */}
            <input type="file" ref={fileInputRef} className="hidden-file-input" accept="image/*" multiple onChange={handleImageSelect} />
            {isAnalyzing ? <Loader2 className="animate-spin mx-auto mb-2 text-primary" size={24}/> : <Layers className="mx-auto mb-2 text-primary" size={24}/>}
            <div className="text-sm font-bold">Scan Photos</div>
            <div className="text-[10px] text-muted">
              {isAnalyzing && batchProgress.total > 0 ? `Processing ${batchProgress.current}/${batchProgress.total}` : "Batch Import Support"}
            </div>
          </div>

          <div className="import-option opacity-50 cursor-not-allowed" title="Requires Vercel Backend">
            <LinkIcon className="mx-auto mb-2 text-muted" size={24}/>
            <div className="text-sm font-bold text-muted">Import URL</div>
            <div className="text-[10px] text-muted">Requires Vercel Backend</div>
          </div>
        </div>

        {/* Test API Key Input (For Preview Mode) */}
        <div className="card bg-slate-100 dark:bg-slate-800/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Key size={14} className="text-muted"/>
            <span className="text-xs font-bold text-muted uppercase">Test API Key (Preview Mode)</span>
          </div>
          <input 
            className="input-field text-xs py-2" 
            placeholder="Paste Gemini API Key here to test without Vercel deployment..."
            value={testApiKey}
            onChange={(e) => setTestApiKey(e.target.value)}
            type="password"
          />
        </div>

        {/* Smart Text Parser (Fallback) */}
        <div className="card bg-slate-100 dark:bg-slate-800/50">
        <div className="font-black text-[10px] uppercase mb-4 text-primary flex items-center gap-2"><AlignLeft size={14}/> Text Parser</div>
        <div className="space-y-3">
        <AutoTextarea
          className="textarea-field auto-expand-textarea"
          placeholder="Paste full text here..."
          value={rawTextImport}
          onChange={e => setRawTextImport(e.target.value)}
        />
        <button className="btn-action w-full bg-slate-500 btn-sm" onClick={handleLocalParse} disabled={!rawTextImport.trim()}><ClipboardType size={16}/> Parse Text</button>
        </div>
        </div>

        <div className="card">
        <div className="font-black text-[10px] uppercase mb-4 text-muted">Creative Studio</div>
        <div className="space-y-4">
        <input className="input-field" placeholder="Name" value={manual.name} onChange={e => setManual({...manual, name: e.target.value})}/>
        {/* Auto-expanding Textareas */}
        <AutoTextarea
          className="textarea-field"
          placeholder="Ingredients"
          value={manual.ings}
          onChange={e => setManual({...manual, ings: e.target.value})}
        />
        <AutoTextarea
          className="textarea-field"
          placeholder="Instructions"
          value={manual.inst}
          onChange={e => setManual({...manual, inst: e.target.value})}
        />
        <button className="btn-action w-full btn-sm" onClick={manualSaveNewRecipe} disabled={isImporting || !manual.name}><SaveIcon size={20}/> Save</button>
        </div>
        </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="space-y-4">
        <div className="card text-[11px] font-mono">
        <div className="flex justify-between items-center mb-4"><div className="font-black text-xs text-primary uppercase">System Status</div>
        <div className="flex gap-2">
            <button onClick={handleReconnect} title="Force Reconnect Database"><WifiOff size={12} className="text-red-500"/></button>
            <button onClick={() => window.location.reload()}><RefreshCw size={12}/></button>
        </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4 border-b border-border pb-4">
          <div><span className="text-muted">App ID:</span> {appId}</div>
          <div><span className="text-muted">User ID:</span> <span className="text-[10px] break-all">{user ? user.uid : 'None'}</span></div>
          <div><span className="text-muted">Email:</span> {user ? user.email : 'None'}</div>
          <div><span className="text-muted">Recipes:</span> {recipes ? recipes.length : 0}</div>
          <div><span className="text-muted">Auth:</span> {user?.isAnonymous ? 'Anon' : 'Google/Email'}</div>
        </div>

        <div className="font-black text-xs text-primary uppercase mb-2">Event Log</div>
        {debugLogs.map((log, i) => <div key={i} className="py-1 border-b border-border/20">{log}</div>)}
        </div>
        </div>
      )}
      </main>
      </div>
    );
};

export default App;
