/**
 * @file editor-keyboard-mapping.ts
 * @copyright 2024, Firaxis Games
 * @description The keyboard mapping screen.
 */
import { ActionActivateEventName } from '/core/ui/components/fxs-activatable.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import DialogManager, { DialogBoxAction } from '/core/ui/dialog-box/manager-dialog-box.js';
import Panel from '/core/ui/panel-support.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import FxsButton from '/core/ui/components/fxs-button.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import { TtsManager } from '/core/ui/accessibility/tts-manager.js';

const KEYS_TO_ADD = [
    "keyboard-nav-down",
    "keyboard-nav-up",
    "keyboard-nav-left",
    "keyboard-nav-right",
    "keyboard-camera-modifier",
    "keyboard-enter",
    "force-end-turn",
    "open-attributes",
    "open-civics",
    "open-greatworks",
    "open-rankings",
    "open-techs",
    "open-traditions",
    "open-civilopedia",
    "quick-load",
    "quick-save",
    "toggle-grid-layer",
    "toggle-yields-layer",
    "toggle-resources-layer",
    "unit-move",
    "unit-ranged-attack",
    "unit-skip-turn",
    "unit-sleep",
    "unit-heal",
    "unit-fortify",
    "unit-alert"
];

export const registerKey = (key) => {
    console.log(`lib-register-keybinding: registering key: ${key}`);

    if (KEYS_TO_ADD.includes(key)) {
        console.log(`lib-register-keybinding: ignoring already registered key ${key}`);
        return;
    }

    KEYS_TO_ADD.push(key);
}

if (TtsManager.isTtsSupported) {
    KEYS_TO_ADD.push("text-to-speech-keyboard");
}
const STARTING_INNER_HTML = `
<div class="w-1\\/2 h-full pt-4 pb-2">
	<fxs-frame class="w-full h-full" frame-style="simple">
		<fxs-vslot class="flex-auto">
			<fxs-scrollable>
				<fxs-spatial-slot class="action-container flex-auto" tabIndex="-1"></fxs-spatial-slot>
			</fxs-scrollable>
		</fxs-vslot>
		<fxs-hslot class="keyboard-mapping_confirm-reset-container flex flex-row justify-between items-end mt-6">
			<fxs-button id="options-revert" class="ml-2"
						data-audio-group-ref="options" data-audio-activate="options-default-selected"
						caption="LOC_OPTIONS_RESET_TO_DEFAULTS"></fxs-button>
			<fxs-hero-button id="options-confirm" class="ml-2"
						caption="LOC_OPTIONS_CONFIRM_CHANGES" data-audio-group-ref="options"
						data-audio-activate-ref="data-audio-options-confirm"></fxs-button>
		</fxs-hslot>
		<fxs-close-button></fxs-close-button>
	</fxs-frame>
</div>`;

class EditorKeyboardMapping extends Panel {
    constructor() {
        super(...arguments);
        this.mappingDataMap = new Map();
        this.engineInputListener = this.onEngineInput.bind(this);
        this.closeButtonListener = this.onCloseButton.bind(this);
        this.revertButtonListener = this.onRevertButton.bind(this);
        this.confirmButtonListener = this.onConfirmButton.bind(this);
    }

    onInitialize() {
        super.onInitialize();
        this.render();
    }

    onAttach() {
        super.onAttach();
        this.Root.addEventListener("engine-input", this.engineInputListener);
        this.closeButton.addEventListener('action-activate', this.closeButtonListener);
        this.revertButton.addEventListener('action-activate', this.revertButtonListener);
        this.confirmButton.addEventListener('action-activate', this.confirmButtonListener);
        Audio.playSound("data-audio-window-overlay-open");
        const confirmResetContainer = MustGetElement(".keyboard-mapping_confirm-reset-container", this.Root);
        Databind.classToggle(confirmResetContainer, 'hidden', `g_NavTray.isTrayRequired`);
    }

    onDetach() {
        this.Root.removeEventListener("engine-input", this.engineInputListener);
        this.closeButton.removeEventListener('action-activate', this.closeButtonListener);
        this.revertButton.removeEventListener('action-activate', this.revertButtonListener);
        this.confirmButton.removeEventListener('action-activate', this.confirmButtonListener);
        super.onDetach();
        Audio.playSound("data-audio-window-overlay-close");
    }

    render() {
        this.Root.innerHTML = STARTING_INNER_HTML;
        this.closeButton = MustGetElement('fxs-close-button', this.Root);
        this.revertButton = MustGetElement('#options-revert', this.Root);
        this.confirmButton = MustGetElement('#options-confirm', this.Root);
        this.actionContainer = MustGetElement('.action-container', this.Root);

        // Add Universal Actions First
        this.addActionsForContext(InputContext.ALL);
        for (let i = 0; i < Input.getNumContexts(); i++) {
            const context = Input.getContext(i);
            this.addActionsForContext(context);
        }
    }

    onReceiveFocus() {
        super.onReceiveFocus();
        FocusManager.setFocus(MustGetElement(".action-container", this.Root));
        NavTray.addOrUpdateShellAction1("LOC_UI_KBM_MAPPING_CONFIRM_CHANGE_TITLE");
        NavTray.addOrUpdateShellAction2("LOC_OPTIONS_RESET_TO_DEFAULTS");
    }

    onLoseFocus() {
        NavTray.clear();
        super.onLoseFocus();
    }

    addActionsForContext(inputContext) {
        for (const actionIdString of KEYS_TO_ADD) {
            const actionId = Input.getActionIdByName(actionIdString);
            if (!actionId) {
                console.error(`editor-keyboard-mapping: getActionIdByName failed for ${actionIdString}`);
                continue;
            }
            if (this.mappingDataMap.has(actionId)) {
                // This action has already been added. Skip it!
                continue;
            }
            if (!Input.hasGesture(actionId, 0, inputContext) && !Input.hasGesture(actionId, 1, inputContext)) {
                // This action has no gestures in this context. Skip it!
                continue;
            }
            this.actionContainer.appendChild(this.createActionEntry(actionId, inputContext));
        }
    }

    createActionEntry(actionId, inputContext) {
        const actionName = Input.getActionName(actionId);
        const actionDescription = Input.getActionDescription(actionId);
        const entry = document.createElement("div");
        entry.classList.add("flex", "items-center", "justify-end", "my-2");
        const nameElement = document.createElement("div");
        nameElement.setAttribute("data-l10n-id", actionName);
        entry.appendChild(nameElement);
        const slotOneButton = document.createElement("editor-keyboard-button");
        const slotOneNode = {
            context: inputContext,
            actionName,
            actionID: actionId,
            gestureIndex: 0
        };
        slotOneButton.setAttribute("node", JSON.stringify(slotOneNode));
        entry.appendChild(slotOneButton);
        const slotTwoButton = document.createElement("editor-keyboard-button");
        const slotTwoNode = {
            context: inputContext,
            actionName,
            actionID: actionId,
            gestureIndex: 1
        };
        slotTwoButton.setAttribute("node", JSON.stringify(slotTwoNode));
        entry.appendChild(slotTwoButton);
        const mappingData = {
            name: actionName,
            description: actionDescription,
            context: inputContext,
            buttonElements: [slotOneButton, slotTwoButton]
        };
        this.mappingDataMap.set(actionId, mappingData);
        return entry;
    }

    onCloseButton() {
        this.close();
    }

    onRevertButton() {
        const defaultCallback = (eAction) => {
            if (eAction == DialogBoxAction.Confirm) {
                Input.restoreDefault();
                this.close();
            }
        };
        DialogManager.createDialog_ConfirmCancel({
            body: "LOC_OPTIONS_ARE_YOU_SURE_DEFAULT",
            title: "LOC_OPTIONS_DEFAULT",
            canClose: false,
            displayQueue: "SystemMessage",
            addToFront: true,
            callback: defaultCallback
        });
    }

    onConfirmButton() {
        NavTray.clear();
        DialogManager.createDialog_ConfirmCancel({
            body: "LOC_UI_KBM_MAPPING_CONFIRM_CHANGE_BODY",
            title: "LOC_UI_KBM_MAPPING_CONFIRM_CHANGE_TITLE",
            canClose: false,
            callback: (eAction) => {
                if (eAction == DialogBoxAction.Confirm) {
                    Input.savePreferences();
                    this.close();
                }
            }
        });
    }

    onEngineInput(inputEvent) {
        if (!this.handleEngineInput(inputEvent)) {
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
        ;
    }

    handleEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return true;
        }
        if (inputEvent.isCancelInput()) {
            Input.loadPreferences();
            this.close();
            return false;
        }
        if (inputEvent.detail.name == "shell-action-1") {
            //confirm
            this.onConfirmButton();
            return false;
        }
        if (inputEvent.detail.name == "shell-action-2") {
            //reset
            this.onRevertButton();
            return false;
        }
        return true;
    }
}

const EditorKeyboardMappingTagName = 'editor-keyboard-mapping';
Controls.define(EditorKeyboardMappingTagName, {
    createInstance: EditorKeyboardMapping,
    description: 'Screen for changing the keyboard mapping.',
    classNames: ['editor-keyboard-mapping', 'fullscreen', 'flow-row', 'justify-center', 'items-center']
});

class EditorKeyboardBindingPanel extends Panel {
    constructor() {
        super(...arguments);
        this.engineInputListener = this.onEngineInput.bind(this);
    }

    get editorKeybardBindingPanelNode() {
        return this._node;
    }

    set editorKeybardBindingPanelNode(value) {
        this._node = value;
    }

    onInitialize() {
        this.Root.innerHTML = this.getContent();
        this.contextNameDiv = MustGetElement(".editor-keyboard-binding-panel__context-name", this.Root);
        this.actionNameDiv = MustGetElement(".editor-keyboard-binding-panel__action-name", this.Root);
        this.gestureString = MustGetElement(".editor-keyboard-binding-panel__gesture-string", this.Root);
        this.Root.style.backgroundColor = "rgba(14, 14, 14, 0.86)";
    }

    onAttach() {
        engine.on("InputGestureRecorded", this.onInputGestureRecorded, this);
        this.Root.addEventListener("engine-input", this.engineInputListener);
        Input.beginRecordingGestures([InputDeviceType.Keyboard, InputDeviceType.Mouse], true);
        Audio.playSound("data-audio-window-overlay-open");
    }

    onDetach() {
        engine.off("InputGestureRecorded", this.onInputGestureRecorded, this);
        this.Root.removeEventListener("engine-input", this.engineInputListener);
        Audio.playSound("data-audio-window-overlay-close");
    }

    updateData() {
        const {
            contextName = "",
            context = InputContext.INVALID,
            actionName = "",
            actionID = 0,
        } = this.editorKeybardBindingPanelNode ?? {};
        this.contextNameDiv.setAttribute("title", contextName);
        this.actionNameDiv.setAttribute("data-l10n-id", actionName);
        this.gestureString.setAttribute("data-l10n-id", Input.getGestureDisplayString(actionID, context) ?? "");
    }

    onAttributeChanged(name, oldValue, newValue) {
        super.onAttributeChanged(name, oldValue, newValue);
        switch (name) {
            case 'node':
                this.editorKeybardBindingPanelNode = newValue ? JSON.parse(newValue) : null;
                this.updateData();
                break;
        }
    }

    onReceiveFocus() {
        FocusManager.setFocus(this.Root);
        NavTray.clear();
    }

    onInputGestureRecorded({index}) {
        const {actionID = 0, gestureIndex = 0,} = this.editorKeybardBindingPanelNode ?? {};
        // Always bind KBM keys to InputContext.ALL
        Input.bindAction(actionID, gestureIndex, index, InputContext.ALL);
        this.close();
    }

    onEngineInput(inputEvent) {
        if (inputEvent.detail.status == InputActionStatuses.FINISH && (inputEvent.detail.name == 'mousebutton-left' || inputEvent.detail.name == 'touch-tap' || inputEvent.detail.name == 'keyboard-escape')) {
            this.close();
        }
    }

    getContent() {
        const {contextName = "", actionName = "",} = this.editorKeybardBindingPanelNode ?? {};
        return `
			<div class="w-full h-full flow-column justify-center items-center">
				<fxs-header title="LOC_UI_CONTROLLER_MAPPING_BIND_TITLE" class="font-title text-xl text-center uppercase tracking-100" filigree-style="none"></fxs-header>
				<fxs-header title="${contextName}" class="editor-keyboard-binding-panel__context-name uppercase text-center font-title text-base tracking-100 mt-8" filigree-style="none"></fxs-header>
				<div class="flow-row justify-center -mt-3 mb-3">
					<div class="img-unit-panel-divider -scale-y-100"></div>
					<div class="img-unit-panel-divider -scale-100"></div>
				</div>
				<div class="flow-row items-center">
					<div class="editor-keyboard-binding-panel__action-name flex-auto whitespace-nowrap font-fit-shrink font-title text-base text-accent-3 uppercase mr-16" data-l10n-id="${actionName}"></div>
					<div class="editor-keyboard-binding-panel__gesture-string font-base text-lg"></div>
				</div>
				<div class="font-title text-lg text-accent-2 uppercase text-center mt-6" data-l10n-id="LOC_UI_CONTROLLER_MAPPING_BIND_GESTURE"></div>
			</div>
		`;
    }
}

const EditorKeyboardBindingPanelTagName = 'editor-keyboard-binding-panel';
Controls.define(EditorKeyboardBindingPanelTagName, {
    createInstance: EditorKeyboardBindingPanel,
    description: 'Panel to bind a new gesture to an action.',
    classNames: ['editor-keyboard-binding-panel', 'fullscreen', 'flow-row', 'justify-center', 'items-center', 'pointer-events-auto', 'bg-black'],
    attributes: [{name: 'node'}],
    tabIndex: -1
});

export class EditorKeyboardButton extends FxsButton {
    constructor() {
        super(...arguments);
        this.activateListener = this.onActivate.bind(this);
    }

    get editorControllerChooserNode() {
        return this._buttonNode;
    }

    set editorControllerChooserNode(value) {
        this._buttonNode = value;
    }

    onInitialize() {
        super.onInitialize();
        this.Root.classList.add("w-64", "mx-4");
    }

    onAttach() {
        super.onAttach();
        engine.on("InputActionBinded", this.onInputActionBinded, this);
        this.Root.addEventListener(ActionActivateEventName, this.activateListener);
    }

    onDetach() {
        engine.off("InputActionBinded", this.onInputActionBinded, this);
        this.Root.removeEventListener(ActionActivateEventName, this.activateListener);
        super.onDetach();
    }

    updateData() {
        const {
            context = InputContext.INVALID,
            actionID = 0,
            gestureIndex = 0,
        } = this.editorControllerChooserNode ?? {};
        const actionDescription = Input.getActionDescription(actionID);
        const gestureString = Input.getGestureDisplayString(actionID, gestureIndex, context);
        this.Root.setAttribute('caption', gestureString ?? "");
        this.Root.setAttribute('data-tooltip-content', actionDescription);
    }

    onAttributeChanged(name, oldValue, newValue) {
        switch (name) {
            case 'node':
                this.editorControllerChooserNode = newValue ? JSON.parse(newValue) : null;
                this.updateData();
                break;
            default:
                super.onAttributeChanged(name, oldValue, newValue);
        }
    }

    onInputActionBinded({context: bindedContext, actionId: bindedActionID}) {
        const {context = InputContext.INVALID, actionID = 0,} = this.editorControllerChooserNode ?? {};
        if (context == bindedContext && actionID == bindedActionID) {
            this.updateData();
        }
    }

    onActivate({target}) {
        if (!(target instanceof HTMLElement)) {
            return;
        }
        const {
            context = InputContext.INVALID,
            actionName = "",
            actionID = 0,
            gestureIndex = 0
        } = JSON.parse(target.getAttribute("node") ?? "") ?? {};
        const node = {
            context,
            actionName,
            actionID,
            gestureIndex
        };
        ContextManager.push("editor-keyboard-binding-panel", {
            singleton: true,
            attributes: {"node": JSON.stringify(node), darker: true}
        });
    }
}

Controls.define('editor-keyboard-button', {
    createInstance: EditorKeyboardButton,
    description: 'A button to be used with the editor keyboard screen',
    classNames: ['editor-keyboard-button', 'fxs-button'],
    attributes: [{name: 'node'}, {name: "caption"}, {name: "disabled"}, {name: "index"}, {name: 'selected'}, {name: "select-highlight"}],
    tabIndex: -1
});

//# sourceMappingURL=file:///core/ui/options/editors/editor-keyboard-mapping.js.map
