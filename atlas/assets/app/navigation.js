export function createPersonNavigator({ prepare, activate, find, select, isActive, missing, failed }) {
  let generation = 0;
  return async function navigate(personRef) {
    const request = ++generation;
    const scope = activate();
    try {
      await prepare();
      if (request !== generation || !isActive(scope)) return false;
      const person = find(personRef);
      if (!person) { missing(); return false; }
      select(person);
      return true;
    } catch (error) {
      if (request === generation && isActive(scope)) failed(error);
      return false;
    }
  };
}
