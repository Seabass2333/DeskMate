(function() {
  "use strict";
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
      if (this.currentState === newState && newState === "idle") {
        return true;
      }
      const isReentry = this.currentState === newState;
      this.previousState = this.currentState;
      this.currentState = newState;
      this.emit("stateChange", {
        from: this.previousState,
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
        if (!this.revertTimer && ["interact", "dance", "submissive", "angry"].includes(newState)) {
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
  class SoundManager {
    /** Map of sound ID to entry */
    sounds = /* @__PURE__ */ new Map();
    /** Currently looping sound ID (Ambience Channel) */
    currentAmbienceId = null;
    /** Currently playing SFX Audio (SFX Channel) */
    activeSfx = null;
    /** Global Mute State */
    muted = false;
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
      audio.volume = config.volume;
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
  class DragController {
    character;
    isDragging = false;
    hasMoved = false;
    // Position tracking
    startMouse = { x: 0, y: 0 };
    startWin = { x: 0, y: 0 };
    // Dependencies
    // Note: In legacy mode we received StateMachine, but now we use module imports or global access
    stateMachine;
    constructor(stateMachine) {
      this.stateMachine = stateMachine;
      const el = document.getElementById("character");
      if (!el) throw new Error("Character element not found");
      this.character = el;
      this.init();
    }
    init() {
      this.character.addEventListener("mouseenter", () => {
        window.deskmate.setIgnoreMouseEvents(false);
      });
      this.character.addEventListener("mouseleave", () => {
        if (!this.isDragging) {
          window.deskmate.setIgnoreMouseEvents(true);
        }
      });
      this.character.addEventListener("mousedown", (e) => this.onMouseDown(e));
      window.addEventListener("mousemove", (e) => this.onMouseMove(e));
      window.addEventListener("mouseup", () => this.onMouseUp());
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
        let isQuiet = false;
        if (window.BehaviorEngine) {
          const engine = window.__modernSystem?.behaviorEngine;
          if (engine && typeof engine.isQuietMode === "function") {
            isQuiet = engine.isQuietMode();
          }
        }
        if (!isQuiet) {
          this.transitionTo("drag");
        }
      }
    }
    onMouseUp() {
      if (!this.isDragging) return;
      this.isDragging = false;
      if (window.notificationManager) {
        window.notificationManager.dismiss();
      }
      let isQuiet = false;
      if (window.BehaviorEngine) {
        const engine = window.__modernSystem?.behaviorEngine;
        if (engine && typeof engine.isQuietMode === "function") {
          isQuiet = engine.isQuietMode();
        }
      }
      if (this.hasMoved) {
        if (!isQuiet) {
          if (window.energyManager) {
            window.energyManager.modifyEnergy(5);
          }
          if (window.SoundManager) {
            window.__modernSystem?.soundManager;
          }
        }
      } else {
        if (!isQuiet) {
          if (window.energyManager) {
            window.energyManager.modifyEnergy(2);
          }
          this.transitionTo("interact");
        } else {
          console.log("[DragController] Click ignored (Quiet Mode)");
        }
      }
      if (this.hasMoved) {
        this.revertState();
      }
    }
    /**
     * Helper to transition state using whatever engine is available
     */
    transitionTo(state) {
      if (this.stateMachine && typeof this.stateMachine.transition === "function") {
        this.stateMachine.transition(state);
      } else if (window.BehaviorEngine) {
        const engine = window.__modernSystem?.behaviorEngine;
        if (engine) engine.transition(state);
      }
    }
    revertState() {
      const sm = this.stateMachine;
      if (sm) {
        if (typeof sm.revert === "function" && false) ;
        else if (typeof sm.transition === "function") {
          sm.transition("idle");
        }
      }
    }
    /**
     * Helper to check quiet mode safely
     */
    getIsQuiet() {
      if (window.BehaviorEngine) {
        const engine = window.__modernSystem?.behaviorEngine;
        if (engine && typeof engine.isQuietMode === "function") {
          return engine.isQuietMode();
        }
      }
      return false;
    }
  }
  window.BehaviorEngine = BehaviorEngine;
  window.TriggerScheduler = TriggerScheduler;
  window.SoundManager = SoundManager;
  window.EnergyManager = EnergyManager;
  window.DragController = DragController;
  window.onerror = function(message, source, lineno, colno, error) {
    console.error("[Renderer Error]", message, "\n  Source:", source, "\n  Line:", lineno);
    if (window.deskmate?.trackEvent) {
      window.deskmate.trackEvent("js_error", { message, source, lineno });
    }
    return false;
  };
  window.onunhandledrejection = function(event) {
    console.error("[Unhandled Promise Rejection]", event.reason);
    if (window.deskmate?.trackEvent) {
      window.deskmate.trackEvent("promise_rejection", {
        message: event.reason?.message || String(event.reason)
      });
    }
  };
  async function initModernSystem() {
    if (window.__modernSystemInitialized) {
      console.warn("[Renderer.ts] System already initialized, skipping");
      return;
    }
    window.__modernSystemInitialized = true;
    console.log("[Renderer.ts] Initializing modern behavior system...");
    let skinConfig = await window.deskmate.getCurrentSkin?.();
    const soundManager = new SoundManager();
    if (skinConfig?.sounds) {
      await soundManager.loadSounds(skinConfig.sounds, skinConfig.basePath || "");
      console.log("[Renderer.ts] SoundManager initialized");
    }
    const behaviorEngine = new BehaviorEngine(skinConfig?.behaviors);
    console.log("[Renderer.ts] BehaviorEngine initialized with states:", behaviorEngine.getValidStates());
    let scheduler = null;
    if (skinConfig?.behaviors?.triggers) {
      scheduler = new TriggerScheduler(behaviorEngine, skinConfig.behaviors.triggers);
      console.log("[Renderer.ts] TriggerScheduler started with skin triggers");
    } else {
      scheduler = new TriggerScheduler(behaviorEngine, []);
      console.log("[Renderer.ts] TriggerScheduler started (system triggers only)");
    }
    if (scheduler) {
      scheduler.start();
    }
    const energyManager = new EnergyManager();
    await energyManager.init();
    try {
      const soundEnabled = await window.deskmate.isSoundEnabled();
      soundManager.setMuted(!soundEnabled);
      console.log(`[Renderer.ts] Initial Sound Enabled: ${soundEnabled}`);
    } catch (e) {
      console.warn("[Renderer.ts] Failed to get initial sound setting", e);
    }
    if (window.deskmate.onSettingsUpdated) {
      window.deskmate.onSettingsUpdated((settings) => {
        if (settings.sound && typeof settings.sound.enabled === "boolean") {
          const enabled = settings.sound.enabled;
          soundManager.setMuted(!enabled);
          const currentState = behaviorEngine.getCurrentState();
          const config = soundManager.getConfig(currentState);
          if (enabled && config?.loop && !soundManager.isLooping(currentState)) {
            soundManager.loop(currentState);
          }
        }
      });
    }
    if (window.deskmate.onSkinChange) {
      window.deskmate.onSkinChange(async (skinId) => {
        console.log(`[Renderer.ts] Skin changed to: ${skinId}`);
        const newSkinConfig = await window.deskmate.getCurrentSkin();
        if (newSkinConfig) {
          skinConfig = newSkinConfig;
          if (newSkinConfig.sounds) {
            await soundManager.loadSounds(newSkinConfig.sounds, newSkinConfig.basePath || "");
            console.log(`[Renderer.ts] Sounds reloaded for ${skinId}`);
          } else {
            soundManager.dispose();
          }
        }
      });
    }
    if (window.deskmate.onSkinChange) {
      window.deskmate.onSkinChange(async (skinId) => {
        console.log(`[Renderer.ts] Skin changed to: ${skinId}`);
        const newSkinConfig = await window.deskmate.getCurrentSkin();
        if (newSkinConfig) {
          if (newSkinConfig.sounds) {
            await soundManager.loadSounds(newSkinConfig.sounds, newSkinConfig.basePath || "");
            console.log(`[Renderer.ts] Sounds reloaded for ${skinId}`);
          } else {
            soundManager.dispose();
          }
        }
      });
    }
    const lastSoundTime = /* @__PURE__ */ new Map();
    behaviorEngine.on("stateChange", (event) => {
      if (event.type === "stateChange") {
        const data = event.data;
        console.log(`[Renderer.ts] State: ${data.from} -> ${data.to}`);
        const stateSound = skinConfig?.sounds?.[data.to];
        if (soundManager.isLooping(data.from) || soundManager.isLooping(data.to) || true) ;
        if (stateSound) {
          const config = soundManager.getConfig(data.to);
          if (config?.loop) {
            soundManager.loop(data.to);
          } else {
            const now = Date.now();
            const lastTime = lastSoundTime.get(data.to) || 0;
            if (now - lastTime < 300) {
              console.warn(`[Renderer.ts] Debounced duplicate sound: ${data.to}`);
              return;
            }
            lastSoundTime.set(data.to, now);
            soundManager.stopLoop();
            soundManager.play(data.to);
          }
        } else {
          soundManager.stopLoop();
        }
      }
    });
    try {
      const isQuiet = await window.deskmate.getQuietMode();
      behaviorEngine.setQuietMode(isQuiet);
      console.log(`[Renderer.ts] Initial Quiet Mode: ${isQuiet}`);
    } catch (e) {
      console.warn("[Renderer.ts] Failed to get initial quiet mode", e);
    }
    if (scheduler) {
      scheduler.setContext({ energy: energyManager.getEnergy() });
      energyManager.on("energyChange", (energy) => {
        scheduler.setContext({ energy });
      });
    }
    const dragController = new DragController(behaviorEngine);
    window.__modernSystem = {
      soundManager,
      behaviorEngine,
      energyManager,
      scheduler,
      dragController
    };
    console.log("[Renderer.ts] Modern system ready (legacy system still active)");
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initModernSystem);
  } else {
    initModernSystem();
  }
  console.log("[Renderer.ts] TypeScript entry point loaded");
})();
//# sourceMappingURL=renderer.js.map
