export default class StateMachine {
  constructor(initialState, possibleStates) {
    this.currentState = initialState;
    this.possibleStates = possibleStates;
  }

  setState(newState, data) {
    const state = this.possibleStates[newState];
    if (!state) {
      throw new Error(`Unknown state: ${newState}`);
    }

    this.currentState = newState;

    if (state.onEnter) {
      state.onEnter(data);
    }
  }
}
