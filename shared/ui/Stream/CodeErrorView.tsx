import React from "react";
import { useSelector, useDispatch, useStore } from "react-redux";
import { CodeStreamState } from "../store";
import { getCodeError } from "../store/codeErrors/reducer";
import { Loading } from "../Container/Loading";
import { CodeError } from "./CodeError";
import { DelayedRender } from "../Container/DelayedRender";
import { setCurrentCodeError } from "../store/context/actions";
import { HostApi } from "../webview-api";
import { useDidMount } from "../utilities/hooks";
import { markItemRead } from "./actions";
import { isUnread } from "../store/users/reducer";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { LoadingMessage } from "../src/components/LoadingMessage";

export function CodeErrorView() {
	const dispatch = useDispatch();
	const codeError = useSelector((state: CodeStreamState) => {
		return getCodeError(state.codeErrors, state.context.currentCodeErrorId!);
	});
	const unread = useSelector((state: CodeStreamState) => {
		return codeError ? isUnread(state, codeError) : false;
	});
	const unreadEnabled = useSelector((state: CodeStreamState) =>
		isFeatureEnabled(state, "readItem")
	);

	const store = useStore<CodeStreamState>();

	useDidMount(() => {
		if (store.getState().context.hasFocus)
			HostApi.instance.track("Page Viewed", { "Page Name": "Code Error View" });

		if (codeError == undefined) {
			// TODO: fetch it when we have the api for that
			dispatch(setCurrentCodeError());
		} else if (unread && unreadEnabled) {
			dispatch(markItemRead(codeError.id, codeError.numReplies || 0));
		}
	});

	// this click handler is on the root element of this
	// component, and is meant to dismiss it whenever you
	// click outside the code error. so if the target doesn't
	// have the same class as the root element, then do not
	// perform the cancel operation
	const handleClickField = React.useCallback(event => {
		if (!event.target.classList.contains("code-error-view")) return;
		event.preventDefault();
		dispatch(setCurrentCodeError());
	}, []);

	if (codeError == undefined)
		return (
			<DelayedRender>
				<div style={{ display: "flex", height: "100vh", alignItems: "center" }}>
					<LoadingMessage>Loading Error Group...</LoadingMessage>
				</div>
			</DelayedRender>
		);

	return (
		<div className="code-error-view" onClick={handleClickField}>
			<div className="code-error-container">
				<CodeError codeError={codeError} />
			</div>
		</div>
	);
}
