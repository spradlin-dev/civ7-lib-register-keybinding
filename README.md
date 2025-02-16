# civ7-lib-register-keybinding
civ7 lib mod to register a keybinding to be customized by the user in the controls menu

In a UI Script, you will want to run something like this to register your keybinding, once you have registered it in the database.


```js
import * as ekm from "/core/ui/options/editors/editor-keyboard-mapping.js";

try {
  const hasLibRegisterKeybindingMod = Modding.getInstalledMods().some(mod => mod.id === 'lib-register-keybinding');

  if (hasLibRegisterKeybindingMod && typeof ekm.registerKey !== 'undefined') {
    ekm.registerKey('my-custom-keybinding-action-id'); // the custom id of your keybinding, as specified in the database
    console.log('MyMod: Registered key-binding in options menu.');
  } else {
    console.error('MyMod: Could not register key-binding in options menu.  Did you remember to include the lib-register-keybinding mod?');
  }
} catch (e) {
  console.error('MyMod: Error registering key-binding in options menu.', e);
}

```

This setup will allow your mod to continue working if this library is not installed, the user just won't be able to
customize the keybinding.
