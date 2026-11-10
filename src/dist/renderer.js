(function() {
  "use strict";
  class SkinManager {
    currentSkin = null;
    /**
     * Load a skin by ID from the main process and preload its sprite sheets
     */
    async loadSkin(skinId) {
      try {
        const config = await window.deskmate.loadSkin(skinId);
        if (!config) {
          throw new Error(`Failed to load skin config for: ${skinId}`);
        }
        this.currentSkin = {
          ...config,
          path: `assets/skins/${skinId}`
        };
        await this.preloadAssets(this.currentSkin);
        console.log(`[SkinManager] Loaded skin: ${config.name} (${skinId})`);
        return this.currentSkin;
      } catch (error) {
        console.error("[SkinManager] Error loading skin:", error);
        throw error;
      }
    }
    /**
     * Preload all animation sprite sheets to prevent flickering on state transition
     */
    async preloadAssets(config) {
      const promises = [];
      const preloadItem = (anim) => {
        const src = `${config.path}/${anim.src}`;
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
          img.src = src;
        });
      };
      for (const value of Object.values(config.animations)) {
        if (!value) continue;
        if (Array.isArray(value)) {
          value.forEach((anim) => promises.push(preloadItem(anim)));
        } else {
          promises.push(preloadItem(value));
        }
      }
      try {
        await Promise.all(promises);
        console.log("[SkinManager] Assets preloaded");
      } catch (e) {
        console.warn("[SkinManager] Some assets failed to preload", e);
      }
    }
    /**
     * Get animation configuration by state name (supports weighted random variants and nested search)
     */
    getAnimation(name) {
      if (!this.currentSkin || !this.currentSkin.animations) return null;
      const animConfig = this.currentSkin.animations[name];
      if (animConfig) {
        if (Array.isArray(animConfig)) {
          return this.pickWeighted(animConfig);
        }
        return animConfig;
      }
      const normalizedTarget = name.toLowerCase();
      for (const value of Object.values(this.currentSkin.animations)) {
        if (Array.isArray(value)) {
          const found = value.find((v) => {
            const baseName = v.src.replace(/\.[^/.]+$/, "").toLowerCase();
            return baseName === normalizedTarget || v.src.toLowerCase() === normalizedTarget;
          });
          if (found) {
            return found;
          }
        }
      }
      return null;
    }
    /**
     * Pick an animation variant using weighted random selection
     */
    pickWeighted(variants) {
      const totalWeight = variants.reduce((sum, item) => sum + (item.weight || 1), 0);
      let random = Math.random() * totalWeight;
      for (const variant of variants) {
        const weight = variant.weight || 1;
        if (random < weight) {
          return variant;
        }
        random -= weight;
      }
      return variants[0];
    }
    /**
     * Resolve relative asset path for the active skin
     */
    getAssetPath(filename) {
      if (!this.currentSkin) return null;
      return `${this.currentSkin.path}/${filename}`;
    }
  }
  class AnimationManager {
    element;
    currentAnimation = null;
    transitionTimeout = null;
    skinManager;
    constructor(element, skinManager) {
      this.element = element;
      this.skinManager = skinManager ?? new SkinManager();
    }
    async init() {
      try {
        const settings = await window.deskmate.getSettings();
        const skinId = settings?.currentSkin || settings?.skin || "mochi-v1";
        return await this.skinManager.loadSkin(skinId);
      } catch (e) {
        console.warn("[AnimationManager] Failed to load preferred skin, falling back to mochi-v1:", e);
        try {
          return await this.skinManager.loadSkin("mochi-v1");
        } catch (fallbackError) {
          console.error("[AnimationManager] Fallback skin loading failed:", fallbackError);
          this.applyStaticFallback();
          return null;
        }
      }
    }
    async loadSkin(skinId) {
      console.log(`[AnimationManager] Loading skin: ${skinId}`);
      const skin = await this.skinManager.loadSkin(skinId);
      console.log(`[AnimationManager] Skin loaded: ${skinId}`);
      return skin;
    }
    getCurrentSkin() {
      return this.skinManager.currentSkin;
    }
    /**
     * Play an animation sequence once, then invoke callback
     */
    playOnce(animName, onComplete) {
      const currentSkin = this.skinManager.currentSkin;
      if (!currentSkin) return false;
      const animConfig = this.skinManager.getAnimation(animName);
      if (!animConfig) return false;
      const { src, frames, speed } = animConfig;
      const baseSize = currentSkin.baseSize[0];
      const scale = currentSkin.scale;
      const spriteWidth = baseSize * scale * frames;
      const spriteHeight = baseSize * scale;
      const assetPath = this.skinManager.getAssetPath(src);
      if (!assetPath) return false;
      if (this.currentAnimation) {
        this.currentAnimation.cancel();
      }
      if (this.transitionTimeout) {
        clearTimeout(this.transitionTimeout);
        this.transitionTimeout = null;
      }
      this.element.style.backgroundImage = `url('${assetPath}')`;
      this.element.style.backgroundSize = `${spriteWidth}px ${spriteHeight}px`;
      this.element.style.width = `${baseSize * scale}px`;
      this.element.style.height = `${baseSize * scale}px`;
      this.element.dataset.state = animName;
      this.currentAnimation = this.element.animate(
        [
          { backgroundPosition: "0 0" },
          { backgroundPosition: `-${spriteWidth}px 0` }
        ],
        {
          duration: speed,
          easing: `steps(${frames}, end)`,
          iterations: 1
        }
      );
      this.transitionTimeout = setTimeout(() => {
        this.transitionTimeout = null;
        if (onComplete) onComplete();
      }, speed);
      return true;
    }
    /**
     * Play continuous animation for a state with optional gentle transition
     */
    play(state, fromState) {
      const currentSkin = this.skinManager.currentSkin;
      if (!currentSkin) return;
      if (this.transitionTimeout) {
        clearTimeout(this.transitionTimeout);
        this.transitionTimeout = null;
      }
      if (state === "sleep" && fromState && fromState !== "sleep") {
        const hasSleepy = this.skinManager.getAnimation("sleep_intro") || this.skinManager.getAnimation("idle_sleepy");
        if (hasSleepy) {
          const animKey = this.skinManager.getAnimation("sleep_intro") ? "sleep_intro" : "idle_sleepy";
          console.log(`[Animation] Playing sleep transition: ${animKey}`);
          const started = this.playOnce(animKey, () => {
            this.playDirect("sleep");
          });
          if (started) return;
        }
      }
      if (state === "idle" && fromState === "sleep") {
        const hasWake = this.skinManager.getAnimation("wake_intro") || this.skinManager.getAnimation("idle_laydown");
        if (hasWake) {
          const animKey = this.skinManager.getAnimation("wake_intro") ? "wake_intro" : "idle_laydown";
          console.log(`[Animation] Playing wake transition: ${animKey}`);
          const started = this.playOnce(animKey, () => {
            this.playDirect("idle");
          });
          if (started) return;
        }
      }
      this.playDirect(state);
    }
    playDirect(state) {
      const currentSkin = this.skinManager.currentSkin;
      if (!currentSkin) return;
      const animConfig = this.skinManager.getAnimation(state) || this.skinManager.getAnimation("idle");
      if (!animConfig) {
        console.warn(`[Animation] No animation found for state: ${state}`);
        return;
      }
      const { src, frames, speed } = animConfig;
      const baseSize = currentSkin.baseSize[0];
      const scale = currentSkin.scale;
      const spriteWidth = baseSize * scale * frames;
      const spriteHeight = baseSize * scale;
      const assetPath = this.skinManager.getAssetPath(src);
      if (!assetPath) return;
      this.element.style.backgroundImage = `url('${assetPath}')`;
      this.element.style.backgroundSize = `${spriteWidth}px ${spriteHeight}px`;
      this.element.style.width = `${baseSize * scale}px`;
      this.element.style.height = `${baseSize * scale}px`;
      this.element.dataset.state = state;
      if (this.currentAnimation) {
        this.currentAnimation.cancel();
      }
      this.currentAnimation = this.element.animate(
        [
          { backgroundPosition: "0 0" },
          { backgroundPosition: `-${spriteWidth}px 0` }
        ],
        {
          duration: speed,
          easing: `steps(${frames}, end)`,
          iterations: Infinity
        }
      );
      console.log(`[Animation] Playing: ${state} (${frames} frames, ${speed}ms)`);
    }
    applyStaticFallback() {
      this.element.style.backgroundImage = "url(assets/skins/mochi-v1/idle.png)";
      this.element.style.backgroundSize = "contain";
      this.element.style.backgroundRepeat = "no-repeat";
      this.element.style.width = "128px";
      this.element.style.height = "128px";
    }
  }
  const DEFAULT_CONFIG = {
    states: ["idle", "sleep", "drag", "working", "thinking", "interact", "dance"],
    idleActions: [
      { state: "sleep", weight: 30, duration: 4e3 },
      { state: "dance", weight: 20, duration: 4e3 },
      { state: "interact", weight: 20, duration: 4e3 }
    ],
    idleTimeout: {
      min: 1e4,
      max: 3e4
    },
    interactions: {
      click: { state: null },
      drag: { state: "drag" }
    }
  };
  class BehaviorEngine {
    config;
    currentState = "idle";
    previousState = null;
    quietMode = false;
    // Timers
    idleTimer = null;
    revertTimer = null;
    // Event listeners
    listeners = /* @__PURE__ */ new Map();
    /**
     * Create a BehaviorEngine with optional behavior configuration
     * 
     * @param config - Behavior configuration from skin, uses defaults if not provided
     */
    constructor(config) {
      this.config = config ?? DEFAULT_CONFIG;
      if (!this.config.states.includes("idle")) {
        this.config.states.unshift("idle");
      }
      this.listeners.set("stateChange", /* @__PURE__ */ new Set());
      this.listeners.set("soundPlay", /* @__PURE__ */ new Set());
      this.listeners.set("actionTriggered", /* @__PURE__ */ new Set());
    }
    // ========== State Management ==========
    /**
     * Get current state
     */
    getCurrentState() {
      return this.currentState;
    }
    /**
     * Get previous state
     */
    getPreviousState() {
      return this.previousState;
    }
    /**
     * Get all valid states for this behavior config
     */
    getValidStates() {
      return [...this.config.states];
    }
    /**
     * Dynamically update behavior configuration (e.g. when switching skins)
     */
    setConfig(config) {
      this.clearTimers();
      this.config = config ? {
        ...config,
        states: [...config.states]
      } : {
        ...DEFAULT_CONFIG,
        states: [...DEFAULT_CONFIG.states]
      };
      if (!this.config.states.includes("idle")) {
        this.config.states.unshift("idle");
      }
      if (!this.config.states.includes(this.currentState)) {
        this.currentState = this.quietMode && this.config.states.includes("sleep") ? "sleep" : "idle";
      }
      if (this.currentState === "idle" && !this.quietMode) {
        this.scheduleIdleAction();
      }
    }
    /**
     * Force emit stateChange event for the current state to refresh visuals/animations
     */
    forceRefresh() {
      this.emit("stateChange", {
        from: this.previousState ?? this.currentState,
        to: this.currentState,
        timestamp: Date.now()
      });
    }
    /**
     * Transition to a new state
     * 
     * @param newState - State to transition to
     * @returns true if transition successful, false otherwise
     */
    transition(newState) {
      if (!this.config.states.includes(newState)) {
        console.warn(`[BehaviorEngine] Invalid state: ${newState}`);
        return false;
      }
      if (this.quietMode && newState !== "sleep") {
        console.log(`[BehaviorEngine] Transition blocked by Quiet Mode: ${newState}`);
        return false;
      }
      const reentrantStates = ["interact", "submissive", "angry", "bark", "sniff"];
      const isReentry = this.currentState === newState;
      if (isReentry && !reentrantStates.includes(newState)) {
        return true;
      }
      if (!isReentry) {
        this.previousState = this.currentState;
        this.currentState = newState;
      }
      this.emit("stateChange", {
        from: this.previousState ?? "idle",
        to: newState,
        timestamp: Date.now()
      });
      if (!isReentry) {
        console.log(`[BehaviorEngine] ${this.previousState} -> ${newState}`);
      }
      if (newState === "idle" && !this.quietMode) {
        this.scheduleIdleAction();
      } else if (newState !== "idle" && !this.quietMode) {
        const actionConfig = this.config.idleActions?.find((a) => a.state === newState);
        if (actionConfig?.duration) {
          console.log(`[BehaviorEngine] Auto-revert scheduled for ${newState}: ${actionConfig.duration}ms`);
          this.scheduleRevert(actionConfig.duration);
        }
        if (!this.revertTimer && ["interact", "dance", "submissive", "angry", "bark", "sniff"].includes(newState)) {
          console.warn(`[BehaviorEngine] Safety Revert triggered for stuck state: ${newState}`);
          this.scheduleRevert(3e3);
        }
      }
      return true;
    }
    /**
     * Revert to previous state (or idle if none)
     */
    revert() {
      const targetState = this.previousState ?? "idle";
      this.transition(targetState);
    }
    // ========== Quiet Mode ==========
    /**
     * Enable or disable quiet mode
     * In quiet mode, pet sleeps and no random actions trigger
     * 
     * @param enabled - Whether to enable quiet mode
     */
    setQuietMode(enabled) {
      this.quietMode = enabled;
      console.log(`[BehaviorEngine] Quiet mode: ${enabled ? "ON" : "OFF"}`);
      if (enabled) {
        this.clearTimers();
        if (this.currentState !== "sleep" && this.config.states.includes("sleep")) {
          this.transition("sleep");
        }
      } else {
        if (this.currentState === "sleep") {
          this.transition("idle");
        }
      }
    }
    /**
     * Check if quiet mode is enabled
     */
    isQuietMode() {
      return this.quietMode;
    }
    // ========== Idle Timer ==========
    /**
     * Start the idle action timer
     */
    startIdleTimer() {
      if (this.quietMode) return;
      this.scheduleIdleAction();
    }
    /**
     * Schedule a random idle action
     */
    scheduleIdleAction() {
      this.clearIdleTimer();
      if (this.quietMode || this.currentState !== "idle") return;
      const { min, max } = this.config.idleTimeout ?? { min: 1e4, max: 3e4 };
      const delay = Math.random() * (max - min) + min;
      this.idleTimer = setTimeout(() => {
        this.triggerRandomAction();
      }, delay);
    }
    /**
     * Trigger a weighted random idle action
     */
    triggerRandomAction() {
      if (this.quietMode || this.currentState !== "idle") return;
      const actions = this.config.idleActions;
      if (!actions || actions.length === 0) return;
      const action = this.pickWeightedAction(actions);
      if (!action) return;
      this.emit("actionTriggered", { action });
      this.transition(action.state);
      if (action.duration) {
        this.scheduleRevert(action.duration);
      }
    }
    /**
     * Pick a random action based on weights
     */
    pickWeightedAction(actions) {
      const totalWeight = actions.reduce((sum, a) => sum + a.weight, 0);
      let random = Math.random() * totalWeight;
      for (const action of actions) {
        if (random < action.weight) {
          return action;
        }
        random -= action.weight;
      }
      return actions[0];
    }
    /**
     * Schedule a revert to idle after duration
     */
    scheduleRevert(duration) {
      this.clearRevertTimer();
      this.revertTimer = setTimeout(() => {
        if (this.currentState !== "idle") {
          this.transition("idle");
        }
      }, duration);
    }
    // ========== Event System ==========
    /**
     * Subscribe to an event
     * 
     * @param event - Event type to listen to
     * @param listener - Callback function
     */
    on(event, listener) {
      this.listeners.get(event)?.add(listener);
    }
    /**
     * Unsubscribe from an event
     * 
     * @param event - Event type
     * @param listener - Callback to remove
     */
    off(event, listener) {
      this.listeners.get(event)?.delete(listener);
    }
    /**
     * Emit an event to all listeners
     */
    emit(type, data) {
      const event = { type, data };
      this.listeners.get(type)?.forEach((listener) => listener(event));
    }
    // ========== Cleanup ==========
    /**
     * Clear all timers
     */
    clearTimers() {
      this.clearIdleTimer();
      this.clearRevertTimer();
    }
    clearIdleTimer() {
      if (this.idleTimer) {
        clearTimeout(this.idleTimer);
        this.idleTimer = null;
      }
    }
    clearRevertTimer() {
      if (this.revertTimer) {
        clearTimeout(this.revertTimer);
        this.revertTimer = null;
      }
    }
    /**
     * Clean up all resources
     */
    dispose() {
      this.clearTimers();
      this.listeners.forEach((set) => set.clear());
    }
  }
  class TriggerScheduler {
    engine;
    triggers;
    context = {};
    intervalId = null;
    running = false;
    /**
     * Create a TriggerScheduler
     * 
     * @param engine - BehaviorEngine to control
     * @param triggers - Array of trigger configurations
     */
    constructor(engine, triggers) {
      this.engine = engine;
      this.triggers = this.mergeWithDefaults(triggers);
      this.resetIdleTime();
    }
    /**
     * Merge user triggers with system defaults
     */
    mergeWithDefaults(userTriggers) {
      const defaults = [
        // Night Mode: 23:00 - 06:00 -> Force Sleep
        {
          condition: "hour >= 23 || hour < 6",
          action: { state: "sleep", duration: 6e5 }
          // 10 min sleep blocks
        },
        // Low Energy: < 10 -> Force Sleep
        {
          condition: "energy < 10",
          action: { state: "sleep", duration: 6e4 }
        },
        // Tired: < 30 -> Force Tired/Sleep
        {
          condition: "energy < 30",
          action: { state: "sleep", duration: 3e4 }
        }
      ];
      return [...userTriggers, ...defaults];
    }
    // ========== Lifecycle ==========
    /**
     * Start the evaluation loop
     * 
     * @param intervalMs - Evaluation interval in milliseconds (default: 60000)
     */
    start(intervalMs = 6e4) {
      if (this.running) return;
      this.running = true;
      this.intervalId = setInterval(() => {
        this.evaluate();
      }, intervalMs);
      console.log(`[TriggerScheduler] Started with ${intervalMs}ms interval`);
    }
    /**
     * Stop the evaluation loop
     */
    stop() {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      this.running = false;
      console.log("[TriggerScheduler] Stopped");
    }
    /**
     * Check if scheduler is running
     */
    isRunning() {
      return this.running;
    }
    /**
     * Clean up all resources
     */
    dispose() {
      this.stop();
      this.context = {};
    }
    // ========== Context Management ==========
    /**
     * Update context values
     * 
     * @param values - Partial context to merge
     */
    setContext(values) {
      this.context = { ...this.context, ...values };
    }
    /**
     * Get a context value
     * 
     * @param key - Context key
     */
    getContext(key) {
      return this.context[key];
    }
    /**
     * Reset idle time to 0
     */
    resetIdleTime() {
      this.context.idleTime = 0;
    }
    // ========== Evaluation ==========
    /**
     * Evaluate all triggers and execute first matching action
     */
    evaluate() {
      const now = /* @__PURE__ */ new Date();
      this.context.hour = now.getHours();
      this.context.minute = now.getMinutes();
      this.context.dayOfWeek = now.getDay();
      for (const trigger of this.triggers) {
        if (this.evaluateCondition(trigger.condition)) {
          this.executeAction(trigger.action);
          return;
        }
      }
    }
    /**
     * Safely evaluate a condition expression
     * 
     * @param condition - Condition string (e.g., "idleTime > 5000")
     */
    evaluateCondition(condition) {
      try {
        const ctx = {
          idleTime: this.context.idleTime ?? 0,
          energy: this.context.energy ?? 100,
          hour: this.context.hour ?? (/* @__PURE__ */ new Date()).getHours(),
          minute: this.context.minute ?? (/* @__PURE__ */ new Date()).getMinutes(),
          dayOfWeek: this.context.dayOfWeek ?? (/* @__PURE__ */ new Date()).getDay(),
          ...this.context
        };
        const safeCondition = this.sanitizeCondition(condition);
        const fn = new Function(...Object.keys(ctx), `return ${safeCondition};`);
        return Boolean(fn(...Object.values(ctx)));
      } catch (error) {
        console.warn(`[TriggerScheduler] Failed to evaluate condition: ${condition}`, error);
        return false;
      }
    }
    /**
     * Sanitize condition to prevent code injection
     * Only allows: numbers, operators, parentheses, and known variable names
     */
    sanitizeCondition(condition) {
      const allowedPattern = /^[\w\s<>=!&|()+-]+$/;
      if (!allowedPattern.test(condition)) {
        throw new Error(`Invalid condition: ${condition}`);
      }
      return condition;
    }
    /**
     * Execute a trigger action
     */
    executeAction(action) {
      console.log(`[TriggerScheduler] Executing action:`, action);
      if (action.state) {
        this.engine.transition(action.state);
      }
      if (action.sound) ;
    }
  }
  const ENERGY_TIERS = {
    exhausted: { min: 0, max: 10, animations: ["Dead", "Dead1", "Dead2"] },
    tired: { min: 11, max: 30, animations: ["Sleeping"] },
    relaxed: { min: 31, max: 50, animations: ["Chilling", "Idle"] },
    normal: { min: 51, max: 70, animations: ["Idle", "Happy"] },
    energetic: { min: 71, max: 85, animations: ["Happy", "Excited"] },
    hyper: { min: 86, max: 100, animations: ["Dance", "Excited", "Running"] }
  };
  class EnergyManager {
    energy = 75;
    lastUpdate = Date.now();
    decayInterval = null;
    // Constants
    DECAY_RATE = 1;
    DECAY_INTERVAL_MS = 10 * 60 * 1e3;
    // 10 minutes
    MIN_ENERGY = 5;
    MAX_ENERGY = 100;
    // Event listeners
    listeners = /* @__PURE__ */ new Map();
    constructor() {
    }
    /**
     * Subscribe to events
     */
    on(event, callback) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event)?.push(callback);
    }
    /**
     * Remove event listener
     */
    off(event, callback) {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
        }
      }
    }
    /**
     * Emit event
     */
    emit(event, data) {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.forEach((callback) => {
          try {
            callback(data);
          } catch (err) {
            console.error(`[EnergyManager] Error in event listener for ${event}:`, err);
          }
        });
      }
    }
    /**
     * Initialize energy system
     * Loads saved state and catches up decay
     */
    async init() {
      try {
        const state = await window.deskmate.getPetState();
        this.energy = state?.energy ?? 75;
        this.lastUpdate = new Date(state?.lastEnergyUpdate || Date.now()).getTime();
        const timeSinceLastUpdate = Date.now() - this.lastUpdate;
        const decayIntervals = Math.floor(timeSinceLastUpdate / this.DECAY_INTERVAL_MS);
        if (decayIntervals > 0) {
          const decayAmount = decayIntervals * this.DECAY_RATE;
          this.energy = Math.max(this.MIN_ENERGY, this.energy - decayAmount);
          await this.save();
        }
        this.startDecayTimer();
        this.updateUI();
        this.emit("energyChange", this.energy);
        console.log(`[EnergyManager] Initialized with energy: ${this.energy}`);
      } catch (error) {
        console.warn("[EnergyManager] Init error:", error);
      }
    }
    /**
     * Start the background decay timer
     */
    startDecayTimer() {
      if (this.decayInterval) {
        clearInterval(this.decayInterval);
      }
      this.decayInterval = window.setInterval(() => {
        this.modifyEnergy(-this.DECAY_RATE);
        console.log(`[EnergyManager] Decay: energy now ${this.energy}`);
      }, this.DECAY_INTERVAL_MS);
    }
    /**
     * Modify energy level
     * @param delta Amount to change (-/+)
     * @returns New energy level
     */
    async modifyEnergy(delta) {
      const oldTier = this.getTier();
      this.energy = Math.max(this.MIN_ENERGY, Math.min(this.MAX_ENERGY, this.energy + delta));
      this.lastUpdate = Date.now();
      this.updateUI();
      await this.save();
      this.emit("energyChange", this.energy);
      const newTier = this.getTier();
      if (oldTier !== newTier) {
        this.emit("tierChange", newTier);
      }
      return this.energy;
    }
    /**
     * Save state to persistence layer
     */
    async save() {
      try {
        const petState = await window.deskmate.getPetState() || {};
        petState.energy = this.energy;
        petState.lastEnergyUpdate = (/* @__PURE__ */ new Date()).toISOString();
        await window.deskmate.savePetState(petState);
      } catch (error) {
        console.warn("[EnergyManager] Save error:", error);
      }
    }
    /**
     * Get current energy tier name
     */
    getTier() {
      for (const [tierName, tierData] of Object.entries(ENERGY_TIERS)) {
        if (this.energy >= tierData.min && this.energy <= tierData.max) {
          return tierName;
        }
      }
      return "normal";
    }
    /**
     * Get localized status message based on tier
     */
    async getStatusMessage() {
      const tier = this.getTier();
      switch (tier) {
        case "hyper":
          return await window.deskmate.t("statusHyper");
        case "energetic":
          return await window.deskmate.t("statusEnergetic");
        case "normal":
          return await window.deskmate.t("statusNormal");
        case "tired":
          return await window.deskmate.t("statusTired");
        case "exhausted":
          return await window.deskmate.t("statusExhausted");
        default:
          return await window.deskmate.t("statusMeow");
      }
    }
    /**
     * Get current energy value
     */
    getEnergy() {
      return this.energy;
    }
    /**
     * Update UI elements (Energy Bar)
     */
    updateUI() {
      const bar = document.getElementById("energy-bar");
      if (!bar) return;
      bar.style.width = `${this.energy}%`;
      bar.classList.remove("tired", "energetic");
      const tier = this.getTier();
      if (tier === "exhausted" || tier === "tired") {
        bar.classList.add("tired");
      } else if (tier === "energetic" || tier === "hyper") {
        bar.classList.add("energetic");
      }
    }
    /**
     * Clean up resources
     */
    dispose() {
      if (this.decayInterval) {
        clearInterval(this.decayInterval);
        this.decayInterval = null;
      }
      this.listeners.clear();
    }
  }
  class SoundManager {
    /** Map of sound ID to entry */
    sounds = /* @__PURE__ */ new Map();
    /** Currently looping sound ID (Ambience Channel) */
    currentAmbienceId = null;
    /** Currently playing SFX Audio (SFX Channel) */
    activeSfx = null;
    /** Global Mute State */
    muted = false;
    /** Global Master Volume (0.0 to 1.0, default 0.3 for gentle desktop ambiance) */
    masterVolume = 0.3;
    /**
     * Load sounds from skin configuration
     * Clears any previously loaded sounds
     * 
     * @param soundConfig - Sound configuration from skin config.json
     * @param basePath - Base path to skin folder
     */
    async loadSounds(soundConfig, basePath) {
      this.dispose();
      for (const [id, ref] of Object.entries(soundConfig)) {
        if (ref === void 0) continue;
        const normalized = this.normalizeConfig(ref, basePath);
        const audio = this.createAudioElement(normalized);
        this.sounds.set(id, { audio, config: normalized });
      }
      console.log(`[SoundManager] Loaded ${this.sounds.size} sounds`);
    }
    /**
     * Set global mute state
     * Stops all sounds if muted
     */
    setMuted(muted) {
      this.muted = muted;
      console.log(`[SoundManager] Global Mute: ${muted}`);
      if (muted) {
        this.stopLoop();
      }
    }
    /**
     * Set global master volume (0.0 to 1.0 or 0 to 100)
     */
    setMasterVolume(volume) {
      const normalized = volume > 1 ? Math.min(Math.max(volume / 100, 0), 1) : Math.min(Math.max(volume, 0), 1);
      this.masterVolume = normalized;
      console.log(`[SoundManager] Master Volume: ${Math.round(this.masterVolume * 100)}%`);
      for (const entry of this.sounds.values()) {
        entry.audio.volume = Math.min(Math.max(entry.config.volume * this.masterVolume, 0), 1);
      }
    }
    /**
     * Get current master volume (0.0 to 1.0)
     */
    getMasterVolume() {
      return this.masterVolume;
    }
    /**
     * Play a sound by ID (one-shot)
     * 
     * @param soundId - Sound identifier
     * @returns true if played successfully, false otherwise
     */
    async play(soundId) {
      if (this.muted) return false;
      const entry = this.sounds.get(soundId);
      if (!entry) {
        console.warn(`[SoundManager] Sound not found: ${soundId}`);
        return false;
      }
      try {
        if (entry.config.srcs && entry.config.srcs.length > 1) {
          const newSrc = entry.config.srcs[Math.floor(Math.random() * entry.config.srcs.length)];
          entry.audio.src = newSrc;
        }
        entry.audio.currentTime = 0;
        console.log(`[SoundManager] Attempting to play: ${soundId} (${entry.audio.src})`);
        const promise = entry.audio.play();
        if (promise !== void 0) {
          promise.then(() => {
            console.log(`[SoundManager] Playing: ${soundId}`);
          }).catch((error) => {
            console.error(`[SoundManager] Play failed for ${soundId}:`, error);
          });
        }
        return true;
      } catch (error) {
        console.error(`[SoundManager] Play failed for ${soundId}:`, error);
        return false;
      }
    }
    /** Ambience Loop Timer */
    ambienceTimer = null;
    /**
     * Start a looping sound (Ambience)
     * Stops any currently looping sound first
     * 
     * @param soundId - Sound identifier
     * @returns true if started successfully
     */
    async loop(soundId) {
      if (this.muted) return false;
      this.stopLoop();
      const entry = this.sounds.get(soundId);
      if (!entry) {
        console.warn(`[SoundManager] Sound not found: ${soundId}`);
        return false;
      }
      this.currentAmbienceId = soundId;
      const audio = entry.audio;
      const config = entry.config;
      const playNext = async () => {
        if (this.currentAmbienceId !== soundId) return;
        try {
          audio.currentTime = 0;
          await audio.play();
        } catch (err) {
          console.warn("[SoundManager] Ambience play error:", err);
        }
      };
      if (config.loopDelay) {
        audio.loop = false;
        audio.onended = () => {
          if (this.currentAmbienceId !== soundId) return;
          const delay = Math.random() * (config.loopDelay.max - config.loopDelay.min) + config.loopDelay.min;
          this.ambienceTimer = window.setTimeout(playNext, delay);
        };
        await playNext();
      } else {
        try {
          audio.loop = true;
          audio.onended = null;
          audio.currentTime = 0;
          await audio.play();
        } catch (error) {
          console.error(`[SoundManager] Loop failed for ${soundId}:`, error);
          return false;
        }
      }
      return true;
    }
    /**
     * Stop the currently looping sound
     */
    stopLoop() {
      if (this.ambienceTimer) {
        clearTimeout(this.ambienceTimer);
        this.ambienceTimer = null;
      }
      if (this.currentAmbienceId) {
        const entry = this.sounds.get(this.currentAmbienceId);
        if (entry) {
          entry.audio.pause();
          entry.audio.currentTime = 0;
          entry.audio.loop = false;
          entry.audio.onended = null;
        }
        this.currentAmbienceId = null;
      }
    }
    /**
     * Check if a sound is currently looping
     * 
     * @param soundId - Sound identifier
     */
    isLooping(soundId) {
      return this.currentAmbienceId === soundId;
    }
    /**
     * Get all loaded sound IDs
     */
    getSoundIds() {
      return Array.from(this.sounds.keys());
    }
    /**
     * Get normalized config for a sound
     * Used for testing and debugging
     * 
     * @param soundId - Sound identifier
     */
    getConfig(soundId) {
      return this.sounds.get(soundId)?.config ?? null;
    }
    /**
     * Clean up all audio resources
     */
    dispose() {
      this.stopLoop();
      for (const entry of this.sounds.values()) {
        entry.audio.pause();
        entry.audio.src = "";
      }
      this.sounds.clear();
      this.activeSfx = null;
      this.currentAmbienceId = null;
    }
    // ========== Private Methods ==========
    /**
     * Normalize a sound reference to full config
     */
    normalizeConfig(ref, basePath) {
      if (Array.isArray(ref)) {
        return {
          src: `${basePath}/${ref[0]}`,
          // Fallback compliant
          srcs: ref.map((r) => `${basePath}/${r}`),
          // New property
          loop: false,
          volume: 1,
          playbackRate: 1
        };
      }
      if (typeof ref === "string") {
        return {
          src: `${basePath}/${ref}`,
          loop: false,
          volume: 1,
          playbackRate: 1
        };
      }
      return {
        src: `${basePath}/${ref.src}`,
        srcs: ref.srcs?.map((r) => `${basePath}/${r}`),
        // Handle array in config object too if present
        loop: ref.loop ?? false,
        loopDelay: ref.loopDelay,
        volume: ref.volume ?? 1,
        playbackRate: ref.playbackRate ?? 1
      };
    }
    /**
     * Create and configure an Audio element
     */
    createAudioElement(config) {
      let src = config.src;
      if (config.srcs && config.srcs.length > 0) {
        src = config.srcs[Math.floor(Math.random() * config.srcs.length)];
      }
      const audio = new Audio(src);
      audio.volume = Math.min(Math.max(config.volume * this.masterVolume, 0), 1);
      audio.playbackRate = config.playbackRate;
      audio.loop = config.loop;
      audio.addEventListener("error", (e) => {
        console.error(`[SoundManager] Audio Error for ${src}:`, e, audio.error);
      });
      audio.addEventListener("canplay", () => {
        console.log(`[SoundManager] Audio loaded: ${src.split("/").pop()}`);
      });
      return audio;
    }
  }
  class DragController {
    character;
    isDragging = false;
    hasMoved = false;
    startMouse = { x: 0, y: 0 };
    startWin = { x: 0, y: 0 };
    behaviorEngine;
    energyManager;
    notificationManager;
    chatManager;
    constructor(behaviorEngine, energyManager, notificationManager, chatManager) {
      this.behaviorEngine = behaviorEngine;
      this.energyManager = energyManager ?? null;
      this.notificationManager = notificationManager ?? null;
      this.chatManager = chatManager ?? null;
      const el = document.getElementById("character");
      if (!el) throw new Error("Character element not found");
      this.character = el;
      this.init();
    }
    init() {
      this.character.addEventListener("mouseenter", () => {
        window.deskmate?.setIgnoreMouseEvents(false);
      });
      this.character.addEventListener("mouseleave", () => {
        if (!this.isDragging) {
          window.deskmate?.setIgnoreMouseEvents(true);
        }
      });
      this.character.addEventListener("mousedown", (e) => this.onMouseDown(e));
      window.addEventListener("mousemove", (e) => this.onMouseMove(e));
      window.addEventListener("mouseup", () => this.onMouseUp());
      this.character.addEventListener("dblclick", (e) => {
        e.preventDefault();
        if (this.chatManager) {
          this.chatManager.toggle();
        }
      });
    }
    async onMouseDown(e) {
      if (e.button === 2) return;
      this.startMouse = { x: e.screenX, y: e.screenY };
      const [x, y] = await window.deskmate.getWindowPosition();
      this.startWin = { x, y };
      this.isDragging = true;
      this.hasMoved = false;
    }
    onMouseMove(e) {
      if (!this.isDragging) return;
      const dx = e.screenX - this.startMouse.x;
      const dy = e.screenY - this.startMouse.y;
      window.deskmate.setWindowPosition(this.startWin.x + dx, this.startWin.y + dy);
      if (!this.hasMoved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        this.hasMoved = true;
        if (!this.behaviorEngine.isQuietMode()) {
          this.behaviorEngine.transition("drag");
        }
      }
    }
    onMouseUp() {
      if (!this.isDragging) return;
      this.isDragging = false;
      if (this.notificationManager) {
        this.notificationManager.dismiss();
      }
      const isQuiet = this.behaviorEngine.isQuietMode();
      if (this.hasMoved) {
        if (!isQuiet) {
          if (this.energyManager) {
            this.energyManager.modifyEnergy(5);
          }
          this.behaviorEngine.transition("idle");
        }
      } else {
        if (!isQuiet) {
          if (this.energyManager) {
            this.energyManager.modifyEnergy(2);
          }
          this.behaviorEngine.transition("interact");
        } else {
          console.log("[DragController] Click ignored (Quiet Mode)");
        }
      }
    }
  }
  let bubbleTimer = null;
  let onBubbleDismissCallback = null;
  function getBubbleElements() {
    const bubbleEl = document.getElementById("speech-bubble");
    const bubbleContent = bubbleEl ? bubbleEl.querySelector(".bubble-content") : null;
    return { bubbleEl, bubbleContent };
  }
  function onBubbleDismiss(callback) {
    onBubbleDismissCallback = callback;
  }
  function initBubbleManager() {
    const { bubbleEl } = getBubbleElements();
    if (!bubbleEl) return;
    bubbleEl.addEventListener("click", () => {
      hideBubble();
      if (onBubbleDismissCallback) {
        onBubbleDismissCallback();
      }
    });
    bubbleEl.addEventListener("mouseenter", () => {
      window.deskmate?.setIgnoreMouseEvents(false);
    });
    bubbleEl.addEventListener("mouseleave", () => {
      window.deskmate?.setIgnoreMouseEvents(true);
    });
  }
  function showBubble(text, duration = 3e3, isLoading = false) {
    if (bubbleTimer) {
      clearTimeout(bubbleTimer);
      bubbleTimer = null;
    }
    const { bubbleEl, bubbleContent } = getBubbleElements();
    if (!bubbleEl || !bubbleContent) return;
    bubbleContent.textContent = text;
    bubbleContent.classList.toggle("loading", isLoading);
    bubbleEl.classList.add("visible");
    if (duration > 0) {
      bubbleTimer = setTimeout(() => {
        hideBubble();
      }, duration);
    }
  }
  function hideBubble() {
    if (bubbleTimer) {
      clearTimeout(bubbleTimer);
      bubbleTimer = null;
    }
    const { bubbleEl } = getBubbleElements();
    if (bubbleEl) {
      bubbleEl.classList.remove("visible");
    }
  }
  class ChatManager {
    behaviorEngine;
    inputContainer;
    input;
    sendBtn;
    constructor(behaviorEngine) {
      this.behaviorEngine = behaviorEngine;
      this.inputContainer = document.getElementById("chat-input-container");
      this.input = document.getElementById("chat-input");
      this.sendBtn = document.getElementById("chat-send");
      this.init();
    }
    init() {
      if (!this.inputContainer || !this.input || !this.sendBtn) return;
      this.sendBtn.addEventListener("click", () => this.sendMessage());
      this.input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          this.sendMessage();
        } else if (e.key === "Escape") {
          this.hide();
        }
      });
      window.deskmate?.onTalkToPet?.(() => {
        this.toggle();
      });
      this.inputContainer.addEventListener("mouseenter", () => {
        window.deskmate?.setIgnoreMouseEvents(false);
      });
      this.inputContainer.addEventListener("mouseleave", () => {
        window.deskmate?.setIgnoreMouseEvents(true);
      });
      window.deskmate?.t?.("chatPlaceholder").then((text) => {
        if (this.input && text) {
          this.input.placeholder = text;
        }
      }).catch(() => {
      });
    }
    toggle() {
      if (!this.inputContainer) return;
      if (this.inputContainer.classList.contains("visible")) {
        this.hide();
      } else {
        this.show();
      }
    }
    show() {
      if (!this.inputContainer || !this.input) return;
      this.inputContainer.classList.add("visible");
      setTimeout(() => this.input?.focus(), 100);
    }
    hide() {
      if (!this.inputContainer || !this.input) return;
      this.inputContainer.classList.remove("visible");
      this.input.blur();
    }
    async sendMessage() {
      if (!this.input || !this.inputContainer) return;
      const text = this.input.value.trim();
      if (!text) return;
      this.input.value = "";
      this.inputContainer.classList.remove("visible");
      const thinkingMsg = await window.deskmate.t("thinking");
      showBubble(thinkingMsg, 0, true);
      this.behaviorEngine.transition("thinking");
      try {
        const result = await window.deskmate.askAI(text);
        showBubble(result?.message || "Meow?", 5e3);
        this.behaviorEngine.transition("interact");
        setTimeout(() => {
          if (this.behaviorEngine.getCurrentState() === "interact") {
            this.behaviorEngine.transition("idle");
          }
        }, 3e3);
      } catch (e) {
        const failedMsg = await window.deskmate.t("connectionFailed");
        showBubble(failedMsg);
        this.behaviorEngine.transition("idle");
      }
    }
  }
  class PomodoroManager {
    behaviorEngine;
    energyManager;
    notificationManager;
    timerId = null;
    remainingSeconds = 0;
    isActive = false;
    constructor(behaviorEngine, notificationManager, energyManager) {
      this.behaviorEngine = behaviorEngine;
      this.notificationManager = notificationManager;
      this.energyManager = energyManager ?? null;
      window.deskmate?.onPomodoroStart?.((minutes) => {
        this.start(minutes);
      });
      window.deskmate?.onPomodoroStop?.(() => {
        this.stop(false);
      });
    }
    async start(minutes) {
      if (this.isActive) {
        this.isActive = false;
        if (this.timerId) {
          clearTimeout(this.timerId);
          this.timerId = null;
        }
      }
      this.remainingSeconds = Math.round(minutes * 60);
      this.isActive = true;
      this.behaviorEngine.transition("working");
      const msg = await window.deskmate.t("focusStart");
      showBubble(msg.replace("${min}", String(minutes)), 3e3);
      this.tick();
    }
    tick() {
      if (!this.isActive) return;
      if (this.remainingSeconds <= 0) {
        this.complete();
        return;
      }
      this.remainingSeconds--;
      this.timerId = setTimeout(() => this.tick(), 1e3);
    }
    async stop(completed = false) {
      this.isActive = false;
      if (this.timerId) {
        clearTimeout(this.timerId);
        this.timerId = null;
      }
      if (!completed) {
        this.behaviorEngine.transition("idle");
        const msg = await window.deskmate.t("focusStopped");
        showBubble(msg, 2e3);
      }
    }
    async complete() {
      await this.stop(true);
      window.deskmate?.pomodoroComplete?.();
      if (this.energyManager) {
        await this.energyManager.modifyEnergy(10);
        console.log(`[Energy] Pomodoro complete: energy now ${this.energyManager.getEnergy()}`);
      }
      const validStates = this.behaviorEngine.getValidStates();
      const celebrateState = validStates.includes("dance") ? "dance" : "interact";
      this.behaviorEngine.transition(celebrateState);
      const msg = await window.deskmate.t("focusComplete");
      await this.notificationManager.notify(msg, "pomodoro");
      setTimeout(() => {
        if (this.behaviorEngine.getCurrentState() === celebrateState) {
          this.behaviorEngine.transition("idle");
        }
      }, 4e3);
    }
  }
  class ReminderManager {
    behaviorEngine;
    notificationManager;
    energyManager;
    activeTimers = /* @__PURE__ */ new Map();
    isLoopMode = true;
    durations = {
      test: 10,
      water: 30 * 60,
      rest: 20 * 60,
      stretch: 45 * 60
    };
    messageKeys = {
      test: "testReminderMsg",
      water: "reminderWater",
      rest: "reminderRest",
      stretch: "reminderStretch"
    };
    constructor(behaviorEngine, notificationManager, energyManager) {
      this.behaviorEngine = behaviorEngine;
      this.notificationManager = notificationManager;
      this.energyManager = energyManager ?? null;
      window.deskmate?.onReminderToggle?.((type) => {
        this.toggle(type);
      });
      window.deskmate?.onReminderLoopModeChange?.(async (isLoop) => {
        this.isLoopMode = isLoop;
        const msg = isLoop ? await window.deskmate.t("loopModeOn") : await window.deskmate.t("loopModeOff");
        showBubble(msg, 2e3);
        console.log(`[ReminderManager] Loop mode: ${isLoop ? "ON" : "OFF"}`);
      });
      console.log("[ReminderManager] Initialized");
    }
    updateConfiguration(settings) {
      const intervals = settings?.reminders?.intervals;
      if (!intervals) return;
      if (intervals.water) this.durations.water = intervals.water * 60;
      if (intervals.rest) this.durations.rest = intervals.rest * 60;
      if (intervals.stretch) this.durations.stretch = intervals.stretch * 60;
      console.log("[ReminderManager] Updated durations:", this.durations);
    }
    async toggle(type) {
      const existingTimer = this.activeTimers.get(type);
      if (existingTimer) {
        clearTimeout(existingTimer);
        this.activeTimers.delete(type);
        const disabled = await window.deskmate.t("reminderDisabled");
        showBubble(disabled, 2e3);
        console.log(`[ReminderManager] Cancelled: ${type}`);
      } else {
        await this.start(type);
      }
    }
    async start(type) {
      const duration = this.durations[type];
      if (!duration) {
        console.warn(`[ReminderManager] Unknown type: ${type}`);
        return;
      }
      const enabled = await window.deskmate.t("reminderEnabled");
      showBubble(enabled, 2e3);
      const timerId = setTimeout(() => {
        this.trigger(type);
      }, duration * 1e3);
      this.activeTimers.set(type, timerId);
      console.log(`[ReminderManager] Started: ${type} (${duration}s)`);
    }
    async trigger(type) {
      this.activeTimers.delete(type);
      const key = this.messageKeys[type];
      const message = key ? await window.deskmate.t(key) : `${type} time!`;
      await this.notificationManager.notify(message, "reminder");
      if (this.energyManager) {
        await this.energyManager.modifyEnergy(3);
        console.log(`[Energy] Reminder: energy now ${this.energyManager.getEnergy()}`);
      }
      this.behaviorEngine.transition("interact");
      setTimeout(() => {
        if (this.behaviorEngine.getCurrentState() === "interact") {
          this.behaviorEngine.transition("idle");
        }
      }, 3e3);
      console.log(`[ReminderManager] Triggered: ${type}`);
      if (this.isLoopMode) {
        console.log(`[ReminderManager] Loop mode ON, restarting: ${type}`);
        await this.start(type);
      } else {
        window.deskmate?.reminderComplete?.(type);
      }
    }
  }
  class CoPetManager {
    behaviorEngine;
    energyManager;
    soundManager;
    constructor(behaviorEngine, energyManager, soundManager) {
      this.behaviorEngine = behaviorEngine;
      this.energyManager = energyManager ?? null;
      this.soundManager = soundManager ?? null;
      window.deskmate?.onCoPetPartnerEvent?.((event) => {
        this.handlePartnerEvent(event);
      });
      window.deskmate?.onCoPetOutboundFeedback?.((feedback) => {
        this.handleOutboundFeedback(feedback);
      });
    }
    /**
     * Handle an incoming ambient signal from the remote partner
     */
    async handlePartnerEvent(event) {
      if (!event || !event.actionType) return;
      const partner = event.partnerNickname || "远方的 TA";
      const isQuiet = this.behaviorEngine.isQuietMode();
      let bubbleText = "";
      let energyDelta = 0;
      let targetState = "interact";
      switch (event.actionType) {
        case "touch":
          bubbleText = `💞 「${partner}」隔空摸了摸我喵~ (+2 体力)`;
          energyDelta = 2;
          targetState = "interact";
          break;
        case "feed":
          bubbleText = `🐟 「${partner}」刚投喂了美味小鱼干！(+5 体力)`;
          energyDelta = 5;
          targetState = "interact";
          break;
        case "water_nudge":
          bubbleText = `💧 「${partner}」拍了拍我，提醒你喝口水休息一下~`;
          energyDelta = 1;
          targetState = this.behaviorEngine.getValidStates().includes("dance") ? "dance" : "interact";
          break;
        case "pomodoro_cheer":
          bubbleText = `🍅 「${partner}」完成了一次专注，给你加油打气！(+5 体力)`;
          energyDelta = 5;
          targetState = this.behaviorEngine.getValidStates().includes("dance") ? "dance" : "interact";
          break;
        default:
          return;
      }
      if (this.energyManager && energyDelta > 0) {
        await this.energyManager.modifyEnergy(energyDelta);
      }
      if (isQuiet) {
        console.log(`[CoPetManager] Quiet mode active; silently absorbed ${event.actionType} from ${partner}`);
        return;
      }
      showBubble(bubbleText, 4500);
      this.behaviorEngine.transition(targetState);
      if (this.soundManager) {
        this.soundManager.play("interact");
      }
    }
    /**
     * Handle visual feedback when the local user sends an action to the partner
     */
    handleOutboundFeedback(feedback) {
      if (!feedback || !feedback.message) return;
      showBubble(feedback.message, 3500);
      if (!this.behaviorEngine.isQuietMode()) {
        const state = feedback.actionType === "water_nudge" && this.behaviorEngine.getValidStates().includes("dance") ? "dance" : "interact";
        this.behaviorEngine.transition(state);
      }
    }
  }
  class NotificationManager {
    timesUpAudio;
    isPlaying = false;
    pendingNotifications = [];
    behaviorEngine = null;
    volume = 0.3;
    constructor(behaviorEngine) {
      this.timesUpAudio = document.getElementById("times-up-sound");
      if (this.timesUpAudio) {
        this.timesUpAudio.volume = this.volume;
      }
      this.behaviorEngine = behaviorEngine ?? null;
    }
    setBehaviorEngine(engine) {
      this.behaviorEngine = engine;
    }
    setVolume(volume) {
      const normalized = volume > 1 ? Math.min(Math.max(volume / 100, 0), 1) : Math.min(Math.max(volume, 0), 1);
      this.volume = normalized;
      if (this.timesUpAudio) {
        this.timesUpAudio.volume = normalized;
      }
    }
    /**
     * Queue a notification. If sound is not currently playing, start it immediately.
     */
    async notify(message, type = "pomodoro") {
      this.pendingNotifications.push({ message, type });
      if (this.isPlaying) {
        console.log("[NotificationManager] Queued:", message);
        return;
      }
      await this.playNext();
    }
    async playNext() {
      const nextItem = this.pendingNotifications.shift();
      if (!nextItem) {
        this.isPlaying = false;
        return;
      }
      const { message, type } = nextItem;
      this.isPlaying = true;
      showBubble(message, 0);
      const enabled = await window.deskmate?.isSoundEnabled?.();
      if (enabled && this.timesUpAudio) {
        try {
          const skin = await window.deskmate.getCurrentSkin();
          const defaultSrc = "assets/sounds/BeepBox-Song.mp3";
          let targetSrc = defaultSrc;
          if (skin?.sounds?.alarm && typeof skin.sounds.alarm === "string") {
            const skinPath = `assets/skins/${skin.id}`;
            targetSrc = `${skinPath}/${skin.sounds.alarm}`;
          }
          if (!this.timesUpAudio.src.includes(encodeURI(targetSrc).replace(/\.\.\//g, ""))) {
            this.timesUpAudio.src = targetSrc;
          }
        } catch (e) {
          console.warn("[NotificationManager] Failed to load custom alarm:", e);
          this.timesUpAudio.src = "assets/sounds/BeepBox-Song.mp3";
        }
        this.timesUpAudio.currentTime = 0;
        this.timesUpAudio.play().catch((e) => console.warn("[NotificationManager] Audio error:", e));
      }
      if (this.behaviorEngine) {
        const validStates = this.behaviorEngine.getValidStates();
        const targetState = validStates.includes("dance") ? "dance" : "interact";
        this.behaviorEngine.transition(targetState);
      }
      console.log(`[NotificationManager] Playing: ${type} - ${message}`);
    }
    /**
     * Stop current notification sound and display next queued message (if any)
     */
    dismiss() {
      if (!this.isPlaying) return;
      if (this.timesUpAudio) {
        this.timesUpAudio.pause();
        this.timesUpAudio.currentTime = 0;
      }
      hideBubble();
      if (this.behaviorEngine && !this.behaviorEngine.isQuietMode()) {
        this.behaviorEngine.transition("idle");
      }
      if (this.pendingNotifications.length > 0) {
        const next = this.pendingNotifications.shift();
        showBubble(next.message, 5e3);
        console.log("[NotificationManager] Showing queued:", next.message);
      }
      this.isPlaying = false;
    }
    get isActive() {
      return this.isPlaying;
    }
  }
  window.onerror = function(message, source, lineno) {
    console.error("[Renderer Error]", message, "\n  Source:", source, "\n  Line:", lineno);
    window.deskmate?.trackEvent?.("js_error", { message, source, lineno });
    return false;
  };
  window.onunhandledrejection = function(event) {
    console.error("[Unhandled Promise Rejection]", event.reason);
    window.deskmate?.trackEvent?.("promise_rejection", {
      message: event.reason?.message || String(event.reason)
    });
  };
  async function initApp() {
    if (window.__deskmateInitialized) {
      return;
    }
    window.__deskmateInitialized = true;
    const charEl = document.getElementById("character");
    if (!charEl) {
      console.error("[Renderer] #character element not found");
      return;
    }
    initBubbleManager();
    const skinManager = new SkinManager();
    const animManager = new AnimationManager(charEl, skinManager);
    await animManager.init();
    let skinConfig = await window.deskmate.getCurrentSkin?.();
    const soundManager = new SoundManager();
    if (skinConfig?.sounds) {
      await soundManager.loadSounds(skinConfig.sounds, skinConfig.basePath || "");
    }
    try {
      const soundEnabled = await window.deskmate.isSoundEnabled();
      soundManager.setMuted(!soundEnabled);
    } catch (e) {
      console.warn("[Renderer] Failed to load initial sound state:", e);
    }
    const behaviorEngine = new BehaviorEngine(skinConfig?.behaviors);
    const lastSoundTime = /* @__PURE__ */ new Map();
    behaviorEngine.on("stateChange", (event) => {
      if (event.type !== "stateChange") return;
      const data = event.data;
      animManager.play(data.to, data.from);
      const stateSound = skinConfig?.sounds?.[data.to];
      if (stateSound) {
        const config = soundManager.getConfig(data.to);
        if (config?.loop) {
          soundManager.loop(data.to);
        } else {
          const now = Date.now();
          const lastTime = lastSoundTime.get(data.to) || 0;
          if (now - lastTime < 300) {
            return;
          }
          lastSoundTime.set(data.to, now);
          soundManager.stopLoop();
          soundManager.play(data.to);
        }
      } else {
        soundManager.stopLoop();
      }
    });
    const energyManager = new EnergyManager();
    await energyManager.init();
    const scheduler = new TriggerScheduler(
      behaviorEngine,
      skinConfig?.behaviors?.triggers || []
    );
    scheduler.setContext({ energy: energyManager.getEnergy() });
    energyManager.on("energyChange", (energy) => {
      scheduler.setContext({ energy });
    });
    scheduler.start();
    const notificationManager = new NotificationManager(behaviorEngine);
    onBubbleDismiss(() => notificationManager.dismiss());
    const chatManager = new ChatManager(behaviorEngine);
    const dragController = new DragController(behaviorEngine, energyManager, notificationManager, chatManager);
    const pomodoroManager = new PomodoroManager(behaviorEngine, notificationManager, energyManager);
    const reminderManager = new ReminderManager(behaviorEngine, notificationManager, energyManager);
    const coPetManager = new CoPetManager(behaviorEngine, energyManager, soundManager);
    try {
      const settings = await window.deskmate.getSettings();
      if (settings) {
        reminderManager.updateConfiguration(settings);
        if (typeof settings?.sound?.volume === "number") {
          soundManager.setMasterVolume(settings.sound.volume);
          notificationManager.setVolume(settings.sound.volume);
        }
      }
    } catch (e) {
      console.warn("[Renderer] Failed to load initial settings:", e);
    }
    try {
      const isQuiet = await window.deskmate.getQuietMode();
      behaviorEngine.setQuietMode(isQuiet);
    } catch (e) {
      console.warn("[Renderer] Failed to get initial quiet mode:", e);
    }
    animManager.play(behaviorEngine.getCurrentState());
    window.deskmate.onQuietModeChanged?.((enabled) => {
      behaviorEngine.setQuietMode(enabled);
    });
    window.deskmate.onUpdateAvailable?.((info) => {
      if (!info || !info.version) return;
      if (!behaviorEngine.isQuietMode()) {
        behaviorEngine.transition("touch");
        showBubble(`🎉 发现新版本 v${info.version}！右键我可一键下载更新哦~`, 6500);
      }
    });
    window.deskmate.onSettingsUpdated?.((settings) => {
      if (!settings) return;
      reminderManager.updateConfiguration(settings);
      if (settings.sound) {
        if (typeof settings.sound.enabled === "boolean") {
          const enabled = settings.sound.enabled;
          soundManager.setMuted(!enabled);
          const currentState = behaviorEngine.getCurrentState();
          const config = soundManager.getConfig(currentState);
          if (enabled && config?.loop && !soundManager.isLooping(currentState)) {
            soundManager.loop(currentState);
          }
        }
        if (typeof settings.sound.volume === "number") {
          soundManager.setMasterVolume(settings.sound.volume);
          notificationManager.setVolume(settings.sound.volume);
        }
      }
    });
    window.deskmate.onSkinChange?.(async (skinId) => {
      console.log(`[Renderer] Switching skin to: ${skinId}`);
      await animManager.loadSkin(skinId);
      const newSkinConfig = await window.deskmate.getCurrentSkin();
      if (newSkinConfig) {
        skinConfig = newSkinConfig;
        if (newSkinConfig.sounds) {
          await soundManager.loadSounds(newSkinConfig.sounds, newSkinConfig.basePath || "");
        } else {
          soundManager.dispose();
        }
        behaviorEngine.setConfig(newSkinConfig.behaviors);
      }
      behaviorEngine.forceRefresh();
    });
    window.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      window.deskmate.showContextMenu();
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        chatManager.hide();
        hideBubble();
        notificationManager.dismiss();
      }
    });
    let idleBubbleTimer = null;
    const scheduleIdleBubble = () => {
      if (idleBubbleTimer) clearTimeout(idleBubbleTimer);
      if (behaviorEngine.getCurrentState() !== "idle" || behaviorEngine.isQuietMode()) {
        idleBubbleTimer = setTimeout(scheduleIdleBubble, 3e4);
        return;
      }
      const delay = Math.random() * 75e3 + 45e3;
      idleBubbleTimer = setTimeout(async () => {
        if (behaviorEngine.getCurrentState() === "idle" && !behaviorEngine.isQuietMode()) {
          const skinId = skinConfig?.id || "default";
          const msg = await window.deskmate.getRandomIdleMessage(skinId);
          if (msg) {
            showBubble(msg, 4e3);
          }
        }
        scheduleIdleBubble();
      }, delay);
    };
    scheduleIdleBubble();
    checkHoliday();
    window.__deskmate = {
      animManager,
      skinManager,
      soundManager,
      behaviorEngine,
      energyManager,
      scheduler,
      dragController,
      chatManager,
      pomodoroManager,
      reminderManager,
      coPetManager,
      notificationManager
    };
    console.log("[Renderer] Unified DeskMate runtime initialized");
  }
  function checkHoliday() {
    const today = /* @__PURE__ */ new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const appEl = document.getElementById("app");
    if (!appEl) return;
    appEl.classList.remove("holiday-xmas", "holiday-cny");
    document.getElementById("snow-container")?.remove();
    document.getElementById("cny-container")?.remove();
    if (month === 12 && day >= 24 && day <= 26) {
      appEl.classList.add("holiday-xmas");
      spawnSnowflakes(appEl);
    }
    if (today.getFullYear() === 2026 && month === 2 && day >= 15 && day <= 20) {
      appEl.classList.add("holiday-cny");
      spawnLanterns(appEl);
    }
  }
  function spawnLanterns(appEl) {
    const cnyContainer = document.createElement("div");
    cnyContainer.id = "cny-container";
    cnyContainer.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;overflow:hidden;";
    const lanternLeft = document.createElement("div");
    lanternLeft.className = "lantern lantern-left";
    lanternLeft.innerHTML = "🏮";
    cnyContainer.appendChild(lanternLeft);
    const lanternRight = document.createElement("div");
    lanternRight.className = "lantern lantern-right";
    lanternRight.innerHTML = "🏮";
    cnyContainer.appendChild(lanternRight);
    for (let i = 0; i < 12; i++) {
      const sparkle = document.createElement("div");
      sparkle.innerHTML = "✨";
      sparkle.className = "gold-sparkle";
      sparkle.style.left = `${Math.random() * 100}%`;
      sparkle.style.animationDuration = `${Math.random() * 2 + 3}s`;
      sparkle.style.animationDelay = `-${Math.random() * 5}s`;
      sparkle.style.fontSize = `${Math.random() * 10 + 5}px`;
      cnyContainer.appendChild(sparkle);
    }
    appEl.appendChild(cnyContainer);
  }
  function spawnSnowflakes(appEl) {
    const snowContainer = document.createElement("div");
    snowContainer.id = "snow-container";
    snowContainer.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;overflow:hidden;";
    for (let i = 0; i < 25; i++) {
      const flake = document.createElement("div");
      flake.className = "snowflake";
      const inner = document.createElement("div");
      inner.className = "snowflake-inner";
      inner.innerHTML = "❄️";
      flake.style.left = `${Math.random() * 100}%`;
      flake.style.setProperty("--fall-duration", `${Math.random() * 3 + 4}s`);
      flake.style.setProperty("--fall-delay", `${Math.random() * -10}s`);
      inner.style.setProperty("--sway-duration", `${Math.random() * 2 + 3}s`);
      inner.style.setProperty("--sway-delay", `${Math.random() * -5}s`);
      inner.style.setProperty("--sway-amplitude", `${Math.random() * 30 + 10}px`);
      inner.style.fontSize = `${Math.random() * 12 + 8}px`;
      inner.style.opacity = String(Math.random() * 0.6 + 0.2);
      flake.appendChild(inner);
      snowContainer.appendChild(flake);
    }
    appEl.appendChild(snowContainer);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
})();
//# sourceMappingURL=renderer.js.map
