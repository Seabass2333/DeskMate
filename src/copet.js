/**
 * Pet Profile & 1v1 Co-Pet Hub Controller (copet.html)
 */

(function () {
    const skinPreviewEl = document.getElementById('hub-skin-preview');
    const vipBadgeEl = document.getElementById('hub-vip-badge');
    const petNameHeaderEl = document.getElementById('hub-pet-name');
    const energyBadgeEl = document.getElementById('hub-energy-badge');
    const skinSelectEl = document.getElementById('hub-skin-select');
    const skinLockMsgEl = document.getElementById('hub-skin-lock-msg');

    const unpairedView = document.getElementById('contract-unpaired-view');
    const pairedView = document.getElementById('contract-paired-view');
    const myCodeEl = document.getElementById('hub-my-code');
    const genCodeBtn = document.getElementById('hub-gen-code-btn');

    const partnerCodeInput = document.getElementById('hub-partner-code');
    const sharedPetNameInput = document.getElementById('hub-shared-pet-name');
    const myNicknameInput = document.getElementById('hub-my-nickname');
    const partnerNicknameInput = document.getElementById('hub-partner-nickname');
    const signContractBtn = document.getElementById('hub-sign-contract-btn');

    const bondMyNameEl = document.getElementById('bond-my-name');
    const bondPartnerNameEl = document.getElementById('bond-partner-name');
    const bondPetNameEl = document.getElementById('bond-pet-name');
    const bondDaysCountEl = document.getElementById('bond-days-count');

    const bondLevelPillEl = document.getElementById('bond-level-pill');
    const bondLevelTitleEl = document.getElementById('bond-level-title');
    const bondExpTextEl = document.getElementById('bond-exp-text');
    const bondProgressFillEl = document.getElementById('bond-progress-fill');

    const careBtnTouch = document.getElementById('care-btn-touch');
    const careBtnFeed = document.getElementById('care-btn-feed');
    const careBtnWater = document.getElementById('care-btn-water');
    const timelineListEl = document.getElementById('care-timeline-list');

    const guardDetailsEl = document.getElementById('contract-guard-details');
    const quickEditNamesBtn = document.getElementById('quick-edit-names-btn');
    const editMyNameInput = document.getElementById('edit-my-name');
    const editPetNameInput = document.getElementById('edit-pet-name');
    const editPartnerNameInput = document.getElementById('edit-partner-name');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const unpairConfirmInput = document.getElementById('unpair-confirm-input');
    const confirmUnpairBtn = document.getElementById('confirm-unpair-btn');
    const feedbackMsgEl = document.getElementById('hub-feedback-msg');

    let previewAnim = null;
    let availableSkins = [];
    let isVipUser = false;
    let activePartnerCode = '';

    function showFeedback(text, type = 'success') {
        if (!feedbackMsgEl) return;
        feedbackMsgEl.textContent = text;
        feedbackMsgEl.className = `vip-message ${type}`;
        setTimeout(() => {
            feedbackMsgEl.textContent = '';
            feedbackMsgEl.className = 'vip-message';
        }, 4500);
    }

    function formatTime(isoStr) {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        if (Number.isNaN(d.getTime())) return '';
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    }

    function renderSkinPreview(skin) {
        if (!skinPreviewEl || !skin) return;
        if (previewAnim) {
            previewAnim.cancel();
            previewAnim = null;
        }

        skinPreviewEl.innerHTML = '';

        // Use relative path (previewSpriteRel) to avoid any issues with spaces in directory names
        const spriteUrl = (skin.previewSpriteRel || `assets/skins/${skin.id}/idle.png`).replace(/\\/g, '/');
        const [baseW, baseH] = Array.isArray(skin.baseSize) && skin.baseSize.length === 2
            ? skin.baseSize
            : [32, 32];
        const frames = skin.idleAnimation?.frames || 6;
        const speed = skin.idleAnimation?.speed || 1000;
        const totalWidth = baseW * frames;

        const spriteDiv = document.createElement('div');
        spriteDiv.style.width = `${baseW}px`;
        spriteDiv.style.height = `${baseH}px`;
        spriteDiv.style.backgroundImage = `url("${spriteUrl}")`;
        spriteDiv.style.backgroundRepeat = 'no-repeat';
        spriteDiv.style.backgroundSize = `${totalWidth}px ${baseH}px`;
        spriteDiv.style.imageRendering = 'pixelated';

        // Scale 32x32 sprites by 2x (64px) and 64x64 sprites by 1.25x (80px) with slight vertical centering
        const maxDim = Math.max(baseW, baseH);
        const scale = maxDim >= 64 ? 1.25 : 2;
        const offsetY = maxDim >= 64 ? '-10px' : '-2px';
        spriteDiv.style.transform = `scale(${scale}) translateY(${offsetY})`;
        spriteDiv.style.transformOrigin = 'center center';

        skinPreviewEl.appendChild(spriteDiv);

        if (frames > 1) {
            previewAnim = spriteDiv.animate(
                [
                    { backgroundPosition: '0px 0px' },
                    { backgroundPosition: `-${totalWidth}px 0px` }
                ],
                {
                    duration: speed,
                    easing: `steps(${frames}, end)`,
                    iterations: Infinity
                }
            );
        }
    }

    async function initWardrobe() {
        if (!window.settingsAPI) return;
        try {
            const settings = await window.settingsAPI.getSettings();
            const petState = await window.settingsAPI.getPetState?.() || { energy: 75 };
            isVipUser = Boolean(settings?.vipStatus?.enabled || settings?.vip?.enabled);

            if (energyBadgeEl && typeof petState.energy === 'number') {
                energyBadgeEl.textContent = `⚡ 体力 ${Math.round(petState.energy)}%`;
            }

            availableSkins = settings?.availableSkins || [];
            const currentSkinId = settings?.currentSkin || 'mochi-v1';

            if (skinSelectEl) {
                skinSelectEl.innerHTML = '';
                availableSkins.forEach(skin => {
                    const opt = document.createElement('option');
                    opt.value = skin.id;
                    const locked = !isVipUser && skin.id !== 'mochi-v1';
                    opt.textContent = `${skin.name}${locked ? ' 🔒 (VIP)' : ''}`;
                    if (skin.id === currentSkinId) opt.selected = true;
                    skinSelectEl.appendChild(opt);
                });

                const activeSkin = availableSkins.find(s => s.id === currentSkinId) || availableSkins[0];
                if (activeSkin) {
                    renderSkinPreview(activeSkin);
                    if (vipBadgeEl) {
                        vipBadgeEl.classList.toggle('hidden', activeSkin.id === 'mochi-v1');
                    }
                }

                skinSelectEl.addEventListener('change', async () => {
                    const selectedId = skinSelectEl.value;
                    const selectedSkin = availableSkins.find(s => s.id === selectedId);
                    if (selectedSkin) renderSkinPreview(selectedSkin);

                    const locked = !isVipUser && selectedId !== 'mochi-v1';
                    if (skinLockMsgEl) skinLockMsgEl.classList.toggle('hidden', !locked);
                    if (vipBadgeEl) vipBadgeEl.classList.toggle('hidden', selectedId === 'mochi-v1');

                    if (!locked && window.settingsAPI.setSkin) {
                        const res = await window.settingsAPI.setSkin(selectedId);
                        if (res?.success) {
                            showFeedback(`🎨 已换上「${selectedSkin?.name || selectedId}」外观！`, 'success');
                        }
                    }
                });

                // Keep Pet Hub in sync if skin is switched from the pet's right-click menu
                window.settingsAPI.onSkinChange?.((newSkinId) => {
                    if (!newSkinId) return;
                    skinSelectEl.value = newSkinId;
                    const matched = availableSkins.find(s => s.id === newSkinId);
                    if (matched) renderSkinPreview(matched);
                    if (vipBadgeEl) vipBadgeEl.classList.toggle('hidden', newSkinId === 'mochi-v1');
                });
            }
        } catch (err) {
            console.warn('[CoPetHub] Failed to init wardrobe:', err);
        }
    }

    function renderCoPetStatus(status) {
        if (!status) return;

        activePartnerCode = (status.partnerCode || '').toUpperCase();

        if (myCodeEl && status.myCode) {
            myCodeEl.textContent = status.myCode;
        }

        if (petNameHeaderEl) {
            petNameHeaderEl.textContent = status.petName || 'Mochi';
        }

        if (!status.paired) {
            unpairedView.classList.remove('hidden');
            pairedView.classList.add('hidden');
            if (guardDetailsEl) guardDetailsEl.open = false;
            return;
        }

        unpairedView.classList.add('hidden');
        pairedView.classList.remove('hidden');

        if (bondMyNameEl) bondMyNameEl.textContent = status.myNickname || '我';
        if (bondPartnerNameEl) bondPartnerNameEl.textContent = status.partnerNickname || '远方的 TA';
        if (bondPetNameEl) bondPetNameEl.textContent = status.petName || 'Mochi';
        if (bondDaysCountEl) bondDaysCountEl.textContent = String(status.togetherDays || 1);

        if (editMyNameInput) editMyNameInput.value = status.myNickname || '我';
        if (editPetNameInput) editPetNameInput.value = status.petName || 'Mochi';
        if (editPartnerNameInput) editPartnerNameInput.value = status.partnerNickname || '';

        // Render Bond Level & Progress
        const bond = status.bond || { level: 1, title: '初识之约', exp: 0, nextExp: 50, progressPercent: 0 };
        if (bondLevelPillEl) bondLevelPillEl.textContent = `Lv.${bond.level}`;
        if (bondLevelTitleEl) bondLevelTitleEl.textContent = bond.title;
        if (bondExpTextEl) {
            bondExpTextEl.textContent = bond.nextExp
                ? `羁绊值 ${bond.exp} / ${bond.nextExp}`
                : `羁绊值 ${bond.exp} (MAX)`;
        }
        if (bondProgressFillEl) {
            bondProgressFillEl.style.width = `${bond.progressPercent}%`;
        }

        // Render Care Timeline
        if (timelineListEl) {
            const logs = status.logs || [];
            const myName = status.myNickname || '我';
            if (logs.length === 0) {
                timelineListEl.innerHTML = `<div class="timeline-item"><span class="timeline-item-left">✨ 快向对方发送第一次隔空摸摸吧~</span></div>`;
            } else {
                timelineListEl.innerHTML = logs.map(item => {
                    const actor = item.actor || '伙伴';
                    const isSelf = actor === myName || actor === '我';
                    const actorClass = isSelf ? 'self' : 'partner';
                    return `
                    <div class="timeline-item">
                        <div class="timeline-item-left">
                            <span>${item.icon || '💞'}</span>
                            <span class="timeline-actor ${actorClass}">${actor}</span>
                            <span>${item.text || ''}</span>
                        </div>
                        <div class="timeline-right">
                            <span class="timeline-exp">+${item.expDelta || 0} 羁绊</span>
                            <span class="timeline-time">${formatTime(item.timestamp)}</span>
                        </div>
                    </div>
                `;
                }).join('');
            }
        }
    }

    async function initCoPetHub() {
        if (!window.settingsAPI?.coPetGetStatus) return;

        const status = await window.settingsAPI.coPetGetStatus();
        if (!status.myCode) {
            const gen = await window.settingsAPI.coPetGenerateCode();
            status.myCode = gen?.code || '';
        }
        renderCoPetStatus(status);

        // Listen for real-time status updates (e.g. when remote partner echoes back)
        window.settingsAPI.onCoPetStatusChanged?.((updatedStatus) => {
            renderCoPetStatus(updatedStatus);
        });

        // Generate / Copy Code
        genCodeBtn?.addEventListener('click', async () => {
            const res = await window.settingsAPI.coPetGenerateCode();
            if (res?.code) {
                if (myCodeEl) myCodeEl.textContent = res.code;
                try {
                    await navigator.clipboard.writeText(res.code);
                    showFeedback(`✅ 结契信物 ${res.code} 已复制到剪贴板，快发给 TA 吧！`, 'success');
                } catch (_) {
                    showFeedback(`✅ 结契信物：${res.code}`, 'success');
                }
            }
        });

        // Sign Contract
        signContractBtn?.addEventListener('click', async () => {
            const code = partnerCodeInput?.value.trim() || '';
            const petName = sharedPetNameInput?.value.trim() || 'Mochi';
            const myNickname = myNicknameInput?.value.trim() || '我';
            const partnerNickname = partnerNicknameInput?.value.trim() || '远方的 TA';

            const res = await window.settingsAPI.coPetBind(code, {
                petName,
                myNickname,
                partnerNickname
            });

            if (res?.success) {
                showFeedback(res.message, 'success');
                if (partnerCodeInput) partnerCodeInput.value = '';
                renderCoPetStatus(res.status);
            } else {
                showFeedback(res?.message || '结契失败，请检查配对码', 'error');
            }
        });

        // Care Action Handler with 3s anti-spam cooldown
        const bindCareAction = (btn, actionType) => {
            if (!btn) return;
            btn.addEventListener('click', async () => {
                btn.disabled = true;
                try {
                    const res = await window.settingsAPI.coPetSendAction(actionType);
                    if (res?.success) {
                        showFeedback(res.message, 'success');
                        if (res.status) renderCoPetStatus(res.status);
                    } else {
                        showFeedback(res?.message || '操作失败', 'error');
                    }
                } finally {
                    setTimeout(() => {
                        btn.disabled = false;
                    }, 2500);
                }
            });
        };

        bindCareAction(careBtnTouch, 'touch');
        bindCareAction(careBtnFeed, 'feed');
        bindCareAction(careBtnWater, 'water_nudge');

        // Quick Edit Names Shortcut in Monument Header
        quickEditNamesBtn?.addEventListener('click', () => {
            if (guardDetailsEl) {
                guardDetailsEl.open = true;
                guardDetailsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                setTimeout(() => editMyNameInput?.focus(), 120);
            }
        });

        // Profile Update
        saveProfileBtn?.addEventListener('click', async () => {
            const myNickname = editMyNameInput?.value.trim();
            const petName = editPetNameInput?.value.trim();
            const partnerNickname = editPartnerNameInput?.value.trim();
            const res = await window.settingsAPI.coPetUpdateProfile({ myNickname, petName, partnerNickname });
            if (res?.success) {
                showFeedback(res.message, 'success');
                renderCoPetStatus(res.status);
            }
        });

        // Guarded Unpair Input Validation
        unpairConfirmInput?.addEventListener('input', () => {
            const val = unpairConfirmInput.value.trim();
            const upper = val.toUpperCase();
            const isValid = val === '确认解契' || upper === 'UNPAIR' || (activePartnerCode && upper === activePartnerCode);
            if (confirmUnpairBtn) {
                confirmUnpairBtn.disabled = !isValid;
            }
        });

        confirmUnpairBtn?.addEventListener('click', async () => {
            const token = unpairConfirmInput?.value.trim() || '';
            const res = await window.settingsAPI.coPetUnpair(token);
            if (res?.success) {
                if (unpairConfirmInput) unpairConfirmInput.value = '';
                if (confirmUnpairBtn) confirmUnpairBtn.disabled = true;
                showFeedback(res.message, 'info');
                renderCoPetStatus(res.status);
            } else {
                showFeedback(res?.message || '解契验证未通过', 'error');
            }
        });
    }

    initWardrobe();
    initCoPetHub();
})();
