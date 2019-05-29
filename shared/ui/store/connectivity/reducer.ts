import { ActionType } from "../common";
import * as actions from "./actions";
import { ConnectivityActionsType, ConnectivityState } from "./types";

type ConnectivityActions = ActionType<typeof actions>;

const initialState: ConnectivityState = {
	offline: false // !navigator.onLine
};

export function reduceConnectivity(state = initialState, { type }: ConnectivityActions) {
	switch (type) {
		case ConnectivityActionsType.Offline:
			return { ...state, offline: true };
		case ConnectivityActionsType.Online:
			return { ...state, offline: false };
		case "RESET":
			return initialState;
		default:
			return state;
	}
}
