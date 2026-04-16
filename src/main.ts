import { createDataRegistry } from "./data/registry/DataRegistry.js";
import { loadAllData } from "./data/loaders/dataLoader.js";
import { GameEngine } from "./engine/GameEngine.js";
import { GameUI } from "./ui/GameUI.js";
import "./style.css";

const registry = createDataRegistry();
loadAllData(registry);

const engine = new GameEngine(registry);

const container = document.getElementById("app")!;
const ui = new GameUI(container, engine);
ui.start();
