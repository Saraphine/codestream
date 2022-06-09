import React from "react";
import { connect } from "react-redux";
import { openModal, setProfileUser } from "../../store/context/actions";
import { WebviewModals } from "@codestream/protocols/webview";
import styled from "styled-components";
import {
	setCurrentCodemark,
	setCurrentReview,
	setCurrentCodeError
} from "../../store/context/actions";

interface Props {
	id: string;
	children: React.ReactNode;
	className?: string;
	openModal?: Function;
	setProfileUser?: Function;
	setCurrentCodemark?: Function;
	setCurrentReview?: Function;
	setCurrentCodeError?: Function;
}

const ProfileLink = styled((props: Props) => {
	const onClick = () => {
		props.openModal && props.openModal(WebviewModals.Profile);
		props.setProfileUser && props.setProfileUser(props.id);
		props.setCurrentCodemark && props.setCurrentCodemark();
		props.setCurrentReview && props.setCurrentReview();
		props.setCurrentCodeError && props.setCurrentCodeError();
	};
	if (!props.id) return <>props.children</>;
	return <span {...{ onClickCapture: onClick, className: props.className }}>{props.children}</span>;
})`
	cursor: pointer;
`;

const mapStateToProps = (state, props: Props) => ({});
const Component = connect(mapStateToProps, {
	openModal,
	setProfileUser,
	setCurrentCodemark,
	setCurrentReview,
	setCurrentCodeError
})(ProfileLink);

export { Component as ProfileLink };
