import cx from "classnames";
import React from "react";
import { connect } from "react-redux";
import ContentEditable from "react-contenteditable";
import * as codemarkSelectors from "../store/codemarks/reducer";
import * as actions from "./actions";
const emojiData = require("../node_modules/markdown-it-emoji-mart/lib/data/full.json");
import { CSChannelStream, CSPost, CSUser } from "@codestream/protocols/api";
import VsCodeKeystrokeDispatcher from "../utilities/vscode-keystroke-dispatcher";
import {
	createRange,
	getCurrentCursorPosition,
	isInVscode,
	debounceAndCollectToAnimationFrame
} from "../utils";
import AtMentionsPopup from "./AtMentionsPopup";
import EmojiPicker from "./EmojiPicker";
import Menu from "./Menu";
import Button from "./Button";
import Icon from "./Icon";
import { confirmPopup } from "./Confirm";

type PopupType = "at-mentions" | "slash-commands" | "channels" | "emojis";

type QuotePost = CSPost & { author: { username: string } };

const tuple = <T extends string[]>(...args: T) => args;

const COLOR_OPTIONS = tuple("blue", "green", "yellow", "orange", "red", "purple", "aqua", "gray");

interface State {
	emojiOpen: boolean;
	codemarkOpen: boolean;
	tagsOpen: false | "select" | "edit" | "create";
	cursorPosition?: any;
	currentPopup?: PopupType;
	popupPrefix?: string;
	popupItems?: any[];
	popupIndex?: number;
	selectedPopupItem?: string;
	emojiMenuTarget?: any;
	codemarkMenuTarget?: any;
	tagsMenuTarget?: any;
	editingTag?: any;
	customColor?: string;
	q?: string;
	codemarkMenuStart?: number;
}

interface Props {
	text: string;
	teammates: CSUser[];
	currentUserId: string;
	slashCommands?: any[];
	services: any;
	channelStreams?: CSChannelStream[];
	teamProvider: "codestream" | "slack" | "msteams" | string;
	isDirectMessage?: boolean;
	multiCompose?: boolean;
	submitOnEnter?: boolean;
	placeholder?: string;
	quotePost?: QuotePost;
	onChange?(text: string): any;
	updateTeamTag?(team: any, tag: any): any;
	onChangeSelectedTags?(tag: any): any;
	onEmptyUpArrow?(event: React.KeyboardEvent): any;
	onDismiss?(): any;
	onSubmit?(): any;
	tabIndex?: number;
	teamTags?: any;
	selectedTags?: any;
	toggleTag?: Function;
	relatedCodemarkIds?: any;
	toggleCodemark?: Function;
	codemarks?: any;
	currentTeam?: any;
	__onDidRender?(stuff: { [key: string]: any }): any; // HACKy: sneaking internals to parent
}

export class MessageInput extends React.Component<Props, State> {
	_contentEditable?: { htmlEl: HTMLElement };
	disposables: { dispose(): any }[] = [];

	constructor(props: Props) {
		super(props);
		this.state = {
			emojiOpen: false,
			codemarkOpen: false,
			tagsOpen: false,
			customColor: "",
			codemarkMenuStart: 0
		};
	}

	componentDidMount() {
		if (this.props.quotePost) {
			this.quotePost();
		}
		// so that HTML doesn't get pasted into the input field. without this,
		// HTML would be rendered as HTML when pasted
		if (this._contentEditable) {
			this._contentEditable.htmlEl.addEventListener("paste", function(e) {
				e.preventDefault();
				const text = e.clipboardData!.getData("text/plain");
				document.execCommand("insertHTML", false, text.replace(/\n/g, "<br>"));
			});
		}

		if (isInVscode()) {
			this.disposables.push(
				VsCodeKeystrokeDispatcher.on("keydown", event => {
					if (event.key === "Escape" && event.target.id !== "input-div") {
						this.handleKeyDown(event);
					}
				})
			);
		}

		const text = this.props.text;
		if (text !== "") {
			this.setCurrentCursorPosition(text.length);
		}
	}

	componentDidUpdate(prevProps: Props) {
		if (
			(this.props.quotePost && !prevProps.quotePost) ||
			(this.props.quotePost &&
				prevProps.quotePost &&
				this.props.quotePost.id !== prevProps.quotePost.id)
		) {
			this.quotePost();
		}
	}

	componentWillUnmount() {
		this.disposables.forEach(d => d.dispose());
	}

	quotePost() {
		if (this._contentEditable) {
			this._contentEditable.htmlEl.innerHTML = "";
			this.props.onChange && this.props.onChange("");
		}
		this.focus(() => {
			const post = this.props.quotePost!;
			this.insertTextAtCursor("@" + post.author.username + " said:");
			this.insertNewlineAtCursor();
			this.insertTextAtCursor(">" + post.text);
			this.insertNewlineAtCursor();
		});
	}

	// for keypresses that we can't capture with standard
	// javascript events
	// handleNonCapturedKeyPress(event, eventType) {
	// 	if (eventType == "up") {
	// 		if (this.state.postTextByStream[this.props.streamId] === "") {
	// 			this.props.onEmptyUpArrow(event);
	// 		}
	// 	}
	// 	event.abortKeyBinding();
	// }

	hidePopup() {
		this.setState({ currentPopup: undefined });
	}

	hideEmojiPicker = () => {
		this.setState({ emojiOpen: false });
	};

	hideCodemarkPicker = () => {
		this.setState({ codemarkOpen: false });
	};

	hideTagsPicker = () => {
		this.setState({ tagsOpen: false, q: "" });
	};

	addEmoji = (emoji: typeof emojiData[string]) => {
		this.setState({ emojiOpen: false });
		if (emoji && emoji.colons) {
			this.focus(() => {
				this.setCurrentCursorPosition(this.state.cursorPosition);
				this.insertTextAtCursor(emoji.colons); // + "\u00A0"); <= that's a space
			});
		}
	};

	// https://stackoverflow.com/questions/6249095/how-to-set-caretcursor-position-in-contenteditable-element-div
	setCurrentCursorPosition = chars => {
		if (!this._contentEditable) return;

		if (this._contentEditable.htmlEl.innerHTML === "") {
			return;
		}
		if (chars < 0) chars = 0;

		const selection = window.getSelection()!;

		const inputDiv = document.getElementById("input-div");
		if (inputDiv) {
			const range = createRange(inputDiv.parentNode, { count: chars });

			if (range) {
				range.collapse(false);
				selection.removeAllRanges();
				selection.addRange(range);
			}
		}
	};

	// set up the parameters to pass to the at mention popup
	showPopupSelectors(prefix: string, type: PopupType) {
		const itemsToShow: {
			id?: string;
			headshot?: CSUser;
			identifier?: string;
			description?: string;
		}[] = [];

		// filter out yourself

		const normalizedPrefix = prefix ? prefix.toLowerCase() : prefix;

		if (type === "at-mentions") {
			const teammates = this.props.teammates.filter(({ id }) => id !== this.props.currentUserId);

			Object.values(teammates).forEach(person => {
				const toMatch = `${person.fullName}*${person.username}`.toLowerCase();
				if (toMatch.indexOf(normalizedPrefix) !== -1) {
					itemsToShow.push({
						id: person.id,
						headshot: person,
						identifier: person.username || person.email,
						description: person.fullName
					});
				}
			});
		} else if (type === "slash-commands") {
			// TODO: filtering these commands should happen higher up in the tree
			if (this.props.slashCommands) {
				this.props.slashCommands.map(command => {
					if (command.appliesTo != null && Array.isArray(command.appliesTo)) {
						if (!command.appliesTo.includes(this.props.teamProvider)) return;
					}

					if (command.channelOnly && this.props.isDirectMessage) return;
					if (command.requires && !this.props.services[command.requires]) return;

					const toMatch = command.id.toLowerCase();
					if (toMatch.indexOf(normalizedPrefix) === 0) {
						command.identifier = command.id;
						itemsToShow.push(command);
					}
				});
			}
		} else if (type === "channels") {
			Object.values(this.props.channelStreams || []).forEach(channel => {
				const toMatch = channel.name.toLowerCase();
				if (toMatch.indexOf(normalizedPrefix) !== -1) {
					itemsToShow.push({
						id: channel.name,
						identifier: "#" + channel.name,
						description: channel.purpose || ""
					});
				}
			});
		} else if (type === "emojis") {
			if (normalizedPrefix && normalizedPrefix.length > 1) {
				debugger;
				Object.keys(emojiData).map(emojiId => {
					if (emojiId.indexOf(normalizedPrefix) === 0) {
						itemsToShow.push({ id: emojiId, identifier: emojiData[emojiId] + " " + emojiId });
					}
				});
			} else {
				itemsToShow.push({
					description: "Matching Emoji. Type 2 or more characters"
				});
			}
		}

		if (itemsToShow.length === 0) {
			this.hidePopup();
		} else {
			const selected = itemsToShow[0].id;

			this.setState({
				currentPopup: type,
				popupPrefix: prefix,
				popupItems: itemsToShow,
				popupIndex: 0,
				selectedPopupItem: selected
			});
		}
	}

	// when the input field loses focus, one thing we want to do is
	// to hide the at-mention popup
	handleBlur = (event: React.SyntheticEvent) => {
		// event.preventDefault();
		// turned off because of bad interaction with trying to control when the popup
		// opens/closes explicitly, for example with the @ icon in the messageinput
		// this.hidePopup();
	};

	handleClick = event => {
		this.setState({
			cursorPosition: getCurrentCursorPosition("input-div")
		});
	};

	// depending on the contents of the input field, if the user
	// types a "@" then open the at-mention popup
	handleChange = (event: React.SyntheticEvent) => {
		const newPostText = (event.target as any).value;

		const selection = window.getSelection()!;
		const range = selection.getRangeAt(0);
		const node = range.commonAncestorContainer;
		const nodeText = node.textContent || "";
		const upToCursor = nodeText.substring(0, range.startOffset);
		const peopleMatch = upToCursor.match(/(?:^|\s)@([a-zA-Z0-9_.+]*)$/);
		const channelMatch = upToCursor.match(/(?:^|\s)#([a-zA-Z0-9_.+]*)$/);
		const emojiMatch = upToCursor.match(/(?:^|\s):([a-z+_]*)$/);
		const slashMatch = newPostText.match(/^\/([a-zA-Z0-9+]*)$/);
		if (this.state.currentPopup === "at-mentions") {
			if (peopleMatch) {
				this.showPopupSelectors(peopleMatch[1].replace(/@/, ""), "at-mentions");
			} else {
				// if the line doesn't end with @word, then hide the popup
				this.hidePopup();
			}
		} else if (this.state.currentPopup === "slash-commands") {
			if (slashMatch) {
				this.showPopupSelectors(slashMatch[0].replace(/\//, ""), "slash-commands");
			} else {
				// if the line doesn't start with /word, then hide the popup
				this.hidePopup();
			}
		} else if (this.state.currentPopup === "channels") {
			if (channelMatch) {
				this.showPopupSelectors(channelMatch[1].replace(/#/, ""), "channels");
			} else {
				// if the line doesn't end with #word, then hide the popup
				this.hidePopup();
			}
		} else if (this.state.currentPopup === "emojis") {
			if (emojiMatch) {
				this.showPopupSelectors(emojiMatch[1].replace(/:/, ""), "emojis");
			} else {
				// if the line doesn't look like :word, then hide the popup
				this.hidePopup();
			}
		} else {
			if (peopleMatch) this.showPopupSelectors(peopleMatch[1].replace(/@/, ""), "at-mentions");
			if (slashMatch && !this.props.multiCompose) {
				this.showPopupSelectors(slashMatch[0].replace(/\//, ""), "slash-commands");
			}
			if (channelMatch) this.showPopupSelectors(channelMatch[1].replace(/#/, ""), "channels");
			if (emojiMatch) this.showPopupSelectors(emojiMatch[1].replace(/:/, ""), "emojis");
		}

		// track newPostText as the user types
		this.props.onChange && this.props.onChange(this._contentEditable!.htmlEl.innerHTML);
		this.setState({
			// autoMentions: this.state.autoMentions.filter(mention => newPostText.includes(mention)), // TODO
			cursorPosition: getCurrentCursorPosition("input-div")
		});
	};

	handleSelectAtMention = (id?: string) => {
		// if no id is passed, we assume that we're selecting
		// the currently-selected at mention
		if (!id) id = this.state.selectedPopupItem;

		let toInsert;
		const toInsertPostfix = "";

		if (this.state.currentPopup === "slash-commands") {
			toInsert = id + "\u00A0";
		} else if (this.state.currentPopup === "channels") {
			toInsert = id + "\u00A0";
		} else if (this.state.currentPopup === "emojis") {
			toInsert = id + ":\u00A0";
		} else {
			const user = this.props.teammates.find(t => t.id === id);
			if (!user) return;
			toInsert = user.username + "\u00A0";
		}
		this.hidePopup();
		// setTimeout(() => {
		this.focus();
		// }, 20);
		// the reason for this unicode space is that chrome will
		// not render a space at the end of a contenteditable div
		// unless it is a &nbsp;, which is difficult to insert
		// so we insert this unicode character instead
		this.insertTextAtCursor(toInsert, this.state.popupPrefix);
	};

	// insert the given text at the cursor of the input field
	// after first deleting the text in toDelete
	insertTextAtCursor = (text: string, toDelete: string = "") => {
		let sel, range;
		sel = window.getSelection();

		// if for some crazy reason we can't find a selection, return
		// to avoid an error.
		// https://stackoverflow.com/questions/22935320/uncaught-indexsizeerror-failed-to-execute-getrangeat-on-selection-0-is-not
		if (sel.rangeCount == 0) return;

		range = sel.getRangeAt(0);

		// delete the X characters before the caret
		range.setStart(range.commonAncestorContainer, range.startOffset - toDelete.length);
		// range.moveEnd("character", toDelete.length);

		range.deleteContents();
		const textNode = document.createTextNode(text);
		range.insertNode(textNode);
		range.setStartAfter(textNode);
		sel.removeAllRanges();
		sel.addRange(range);
		if (this._contentEditable) {
			this._contentEditable.htmlEl.normalize();
			// sel.collapse(textNode);
			sel.modify("move", "backward", "character");
			sel.modify("move", "forward", "character");
			// window.getSelection().empty();
			// this.focus();

			this.props.onChange && this.props.onChange(this._contentEditable!.htmlEl.innerHTML);
			this.setState({
				cursorPosition: getCurrentCursorPosition("input-div")
			});
		}
	};

	insertNewlineAtCursor() {
		let sel, range;
		sel = window.getSelection();

		// if for some crazy reason we can't find a selection, return
		// to avoid an error.
		// https://stackoverflow.com/questions/22935320/uncaught-indexsizeerror-failed-to-execute-getrangeat-on-selection-0-is-not
		if (sel.rangeCount == 0) return;

		range = sel.getRangeAt(0);

		// delete the X characters before the caret
		range.setStart(range.commonAncestorContainer, range.startOffset);
		// range.moveEnd("character", toDelete.length);

		range.deleteContents();
		const br1 = document.createElement("BR");
		const br2 = document.createElement("BR");
		range.insertNode(br1);
		range.insertNode(br2);
		range.setStartAfter(br2);
		sel.removeAllRanges();
		sel.addRange(range);
		if (this._contentEditable) {
			this._contentEditable.htmlEl.normalize();
			// sel.collapse(textNode);
			sel.modify("move", "backward", "character");
			sel.modify("move", "forward", "character");
			// window.getSelection().empty();
			// this.focus();

			this.props.onChange && this.props.onChange(this._contentEditable.htmlEl.innerHTML);
			this.setState({
				cursorPosition: getCurrentCursorPosition("input-div")
			});
		}
	}

	// this is asynchronous so callers should provide a callback for code that depends on the completion of this
	focus = debounceAndCollectToAnimationFrame((...cbs: Function[]) => {
		if (this._contentEditable) this._contentEditable.htmlEl.focus();
		cbs.forEach(cb => cb.apply(undefined));
	});

	handleKeyPress = (event: React.KeyboardEvent) => {
		const newPostText = this.props.text;
		const { currentPopup } = this.state;
		const multiCompose = this.props.multiCompose;

		// if we have the at-mentions popup open, then the keys
		// do something different than if we have the focus in
		// the textarea
		if (currentPopup) {
			if (event.key == "Escape") {
				this.hidePopup();
			} else if (event.key == "Enter" && !event.shiftKey) {
				event.preventDefault();
				this.handleSelectAtMention();
			}
		} else if (event.key === "@") {
			this.showPopupSelectors("", "at-mentions");
		} else if (event.key === ":") {
			this.showPopupSelectors("", "emojis");
		} else if (!multiCompose && event.key === "/" && newPostText.length === 0) {
			this.showPopupSelectors("", "slash-commands");
		} else if (event.key === "#") {
			this.showPopupSelectors("", "channels");
		} else if (
			event.charCode === 13 &&
			!event.shiftKey &&
			(event.ctrlKey || event.metaKey || !multiCompose)
		) {
			event.preventDefault();
			const { onSubmit } = this.props;
			onSubmit && onSubmit();
		} else if (event.key == "Escape" && multiCompose && this.props.onDismiss) {
			this.props.onDismiss();
		}
	};

	// the keypress handler for tracking up and down arrow
	// and enter, while the at mention popup is open
	handleAtMentionKeyPress(event: React.KeyboardEvent, eventType: string) {
		event.preventDefault();
		if (eventType == "escape") {
			if (this.state.currentPopup) this.hidePopup();
			else if (this.state.emojiOpen) this.hideEmojiPicker();
			else if (this.state.codemarkOpen) this.hideCodemarkPicker();
			else if (this.state.tagsOpen) this.hideTagsPicker();
			// else this.handleDismissThread();
		} else {
			let newIndex = 0;
			if (eventType == "down") {
				if (this.state.popupIndex! < this.state.popupItems!.length - 1) {
					newIndex = this.state.popupIndex! + 1;
				} else {
					newIndex = 0;
				}
			} else if (eventType == "up") {
				if (this.state.popupIndex == 0) {
					newIndex = this.state.popupItems!.length - 1;
				} else {
					newIndex = this.state.popupIndex! - 1;
				}
			} else if (eventType == "tab") {
				this.handleSelectAtMention();
			}
			this.setState({
				popupIndex: newIndex,
				selectedPopupItem: this.state.popupItems![newIndex].id
			});
		}
	}

	handleKeyDown = (event: React.KeyboardEvent) => {
		const multiCompose = this.props.multiCompose;

		if (this.state.currentPopup) {
			if (event.key === "ArrowUp") {
				event.stopPropagation();
				this.handleAtMentionKeyPress(event, "up");
			}
			if (event.key === "ArrowDown") this.handleAtMentionKeyPress(event, "down");
			if (event.key === "Tab") this.handleAtMentionKeyPress(event, "tab");
			if (event.key === "Escape") {
				this.hidePopup();
				event.preventDefault();
			}
		} else if (this.state.emojiOpen) {
			if (event.key === "Escape") {
				this.hideEmojiPicker();
				event.preventDefault();
			}
		} else if (this.state.codemarkOpen) {
			if (event.key === "Escape") {
				this.hideCodemarkPicker();
				event.preventDefault();
			}
		} else if (this.state.tagsOpen) {
			if (event.key === "Escape") {
				this.hideTagsPicker();
				event.preventDefault();
			}
		} else {
			if (event.key === "ArrowUp" && this.props.text === "" && this.props.onEmptyUpArrow) {
				event.persist();
				event.stopPropagation();
				this.props.onEmptyUpArrow(event);
			} else if (event.key == "Escape" && multiCompose && this.props.onDismiss) {
				this.props.onDismiss();
			} else if (event.key === "Enter" && event.metaKey && multiCompose) {
				// command-enter should submit for multiCompose
				event.preventDefault();
				const { onSubmit } = this.props;
				onSubmit && onSubmit();
			}
		}
	};

	handleHoverAtMention = id => {
		const index = this.state.popupItems!.findIndex(x => x.id == id);

		this.setState({
			popupIndex: index,
			selectedPopupItem: id
		});
	};

	handleClickEmojiButton = (event: React.SyntheticEvent) => {
		event.persist();
		this.setState(state => ({ emojiOpen: !state.emojiOpen, emojiMenuTarget: event.target }));
		// this.focus();
		// event.stopPropagation();
	};

	handleClickCodemarkButton = (event: React.SyntheticEvent) => {
		event.persist();
		this.setState(state => ({
			codemarkOpen: !state.codemarkOpen,
			codemarkMenuTarget: event.target
		}));
	};

	codemarkMenuAction = action => {
		if (!action) this.setState({ codemarkOpen: false });

		switch (action) {
			case "search":
				return;
			case "more":
				return; // FIXME load more codemarks
			default:
				if (action && this.props.toggleCodemark) {
					const codemark = this.props.codemarks.find(codemark => codemark.id === action);
					this.props.toggleCodemark(codemark);
				}
		}
	};

	buildCodemarkMenuOld = () => {
		if (!this.state.codemarkOpen) return null;

		const menuItems = [
			{ label: "Attach Codemark...", action: "attach" },
			{ label: "Post as reply to Codemark...", action: "reply" }
		];
		return (
			<Menu
				items={menuItems}
				action={this.codemarkMenuAction}
				target={this.state.codemarkMenuTarget}
			/>
		);
	};

	buildCodemarkMenu = () => {
		if (!this.state.codemarkOpen) return null;

		let menuItems: any = [
			{ type: "search", placeholder: "Search codemarks...", action: "search" },
			{ label: "-" }
		];

		const { codemarks = [] } = this.props;
		menuItems = menuItems.concat(
			codemarks
				.map(codemark => {
					if (codemark.deactivated) return null;
					const title = codemark.title || codemark.text;
					const icon = this.props.relatedCodemarkIds[codemark.id] ? (
						<Icon style={{ margin: "0 2px 0 2px" }} name="check" />
					) : (
						<Icon
							name={codemark.type || "comment"}
							className={`${codemark.color}-color type-icon`}
						/>
					);
					const file = codemark.markers && codemark.markers[0] && codemark.markers[0].file;
					return {
						icon: icon,
						label: (
							<span className={this.props.relatedCodemarkIds[codemark.id] ? "menu-selected" : ""}>
								&nbsp;{title}&nbsp;&nbsp;<span className="codemark-file">{file}</span>
							</span>
						),
						searchLabel: title || "",
						action: codemark.id
					};
				})
				.filter(Boolean)
		);
		if (codemarks.length === 0) {
			menuItems = menuItems.concat(
				{ label: "-" },
				{ label: "No Codemarks! FIXME", action: "more" }
			);
		}
		// menuItems = menuItems.concat({ label: "-" }, { label: "Show More...", action: "more" });
		return (
			<Menu
				title="Add Codemark"
				items={menuItems}
				action={this.codemarkMenuAction}
				target={this.state.codemarkMenuTarget}
			/>
		);
	};

	handleClickTagButton = (event: React.SyntheticEvent) => {
		event.persist();
		this.setState(state => ({
			tagsOpen: "select",
			tagsMenuTarget: event.target
		}));
	};

	tagsMenuAction = action => {
		switch (action) {
			case "search":
			case "noop":
				return;
			case "create":
				this.setState({ tagsOpen: "create", editingTag: { label: this.state.q, color: "blue" } });
				break;
			default:
				if (this.props.toggleTag) this.props.toggleTag(action);
		}
		if (!action) this.setState({ tagsOpen: false, editingTag: null });
	};

	buildTagMenu = () => {
		switch (this.state.tagsOpen) {
			case "select":
				return this.buildSelectTagMenu();
			case "edit":
				return this.buildEditTagMenu();
			case "create":
				// this.setState({ editingTag: null });
				return this.buildEditTagMenu();
			default:
				return null;
		}
	};

	saveTag = () => {
		const { updateTeamTag, currentTeam } = this.props;

		if (updateTeamTag) updateTeamTag(currentTeam, this.state.editingTag);

		// hide the tags picker and re-open the tags selection menu
		this.hideTagsPicker();
		// i have no idea why the following code needs to be done after a delay.
		// otherwise what ends up happening is you get a double-menu -Pez
		setTimeout(() => {
			this.setState({ tagsOpen: "select" });
		}, 1);
	};

	deleteTag = () => {
		if (!this.state.editingTag.id) {
			this.setState({ editingTag: null });
			this.hideTagsPicker();
			return;
		}

		confirmPopup({
			title: "Are you sure?",
			message:
				"Deleting a tag cannot be undone, and will remove it from any codemarks that contain this tag.",
			centered: true,
			buttons: [
				{
					label: "Delete Tag",
					wait: true,
					action: () => {
						if (this.props.updateTeamTag)
							this.props.updateTeamTag(this.props.currentTeam, {
								...this.state.editingTag,
								deactivated: true
							});
						this.setState({ editingTag: null });
						this.hideTagsPicker();
					}
				},
				{ label: "Cancel" }
			]
		});
	};

	findTag = tagId => {
		return this.props.teamTags.find(tag => {
			return tag.id === tagId;
		});
	};

	setEditingTagColor = color => {
		let { editingTag } = this.state;
		editingTag.color = color;
		this.setState({ editingTag });
	};

	setEditingTagLabel = label => {
		let { editingTag } = this.state;
		editingTag.label = label;
		this.setState({ editingTag });
	};

	buildEditTagMenu = () => {
		let { editingTag } = this.state;
		if (!editingTag) editingTag = { label: "", color: "blue" };

		let body = (
			<div>
				<input
					type="text"
					value={editingTag.label || ""}
					placeholder="Tag Name"
					onChange={e => {
						this.setEditingTagLabel(e.target.value);
					}}
				/>

				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 1fr 1fr",
						gridColumnGap: "10px",
						gridRowGap: "10px",
						margin: "20px 0 10px 0",
						maxWidth: "160px",
						whiteSpace: "normal"
					}}
				>
					{COLOR_OPTIONS.map(color => {
						return (
							<span
								className={`${color}-background tag-edit-block`}
								onClick={e => this.setEditingTagColor(color)}
							>
								{editingTag.color === color && <Icon name="check" className="check" />}
							</span>
						);
					})}
					<div className="tag-edit-block" style={{ backgroundColor: this.state.customColor }}>
						{editingTag.color === this.state.customColor ? (
							<Icon name="check" className="check" />
						) : (
							<div>custom</div>
						)}
						<input
							style={{
								// make it transparent because the default styling
								// is ugly, and we just make the whole block the color
								// that is selected via the magic of React -Pez
								opacity: 0,
								display: "block",
								width: "100%",
								height: "100%",
								position: "absolute",
								top: 0,
								left: 0,
								bottom: 0,
								right: 0
							}}
							type="color"
							className={`custom-tag-edit-block`}
							value={this.state.customColor}
							onChange={e => {
								this.setState({ customColor: e.target.value });
								this.setEditingTagColor(e.target.value);
							}}
						/>
					</div>
				</div>
			</div>
		);
		let body2 = (
			<div className="button-row">
				<Button className="control-button" onClick={this.saveTag}>
					Save
				</Button>
				<Button className="control-button delete" onClick={this.deleteTag}>
					Delete
				</Button>
			</div>
		);

		const items = [
			{ label: body, noHover: true, action: "noop" },
			{ label: "-" },
			{ label: body2, noHover: true, action: "noop" }
		];

		return (
			<Menu
				title={editingTag.id ? "Edit Tag" : "Add Tag"}
				items={items}
				action={this.tagsMenuAction}
				target={this.state.tagsMenuTarget}
			/>
		);
	};

	buildSelectTagMenu = () => {
		const { teamTags } = this.props;
		if (!teamTags) return null;

		let menuItems: any = [
			{ type: "search", placeholder: "Search tags...", action: "search" },
			{ label: "-" }
		];

		menuItems = menuItems.concat(
			teamTags.map(tag => {
				let className = "tag-menu-block";
				if (!tag.color.startsWith("#")) className += " " + tag.color + "-background";
				return {
					label: (
						<span className="tag-menu-selector">
							<span
								className={className}
								style={tag.color.startsWith("#") ? { background: tag.color } : {}}
							>
								{tag.label}&nbsp;
								{this.props.selectedTags[tag.id] && <Icon name="check" className="check" />}
							</span>
							<Icon
								name="pencil"
								className="edit"
								onClick={e => {
									this.setState({ tagsOpen: "edit", editingTag: { ...tag } });
									e.preventDefault();
									e.stopPropagation();
								}}
							/>
						</span>
					),
					noHover: true,
					searchLabel: tag.label || tag.color,
					action: tag.id
				};
			})
		);
		menuItems = menuItems.concat({ label: "-" }, { label: "Create a New Tag", action: "create" });
		return (
			<Menu
				title="Tags"
				items={menuItems}
				action={this.tagsMenuAction}
				target={this.state.tagsMenuTarget}
				onChangeSearch={q => this.setState({ q })}
			/>
		);
	};

	handleClickAtMentions = () => {
		if (this.state.currentPopup) {
			this.focus(() => {
				// this.insertTextAtCursor("", "@");
				this.hidePopup();
			});
		} else
			this.focus(() => {
				// this.insertTextAtCursor("@");
				this.showPopupSelectors("", "at-mentions");
			});

		// this.insertTextAtCursor("@");
	};

	render() {
		const { placeholder, text, __onDidRender } = this.props;

		__onDidRender &&
			__onDidRender({ insertTextAtCursor: this.insertTextAtCursor, focus: this.focus });

		return (
			<div
				className="message-input-wrapper"
				onKeyPress={this.handleKeyPress}
				onKeyDown={this.handleKeyDown}
				style={{ position: "relative" }}
			>
				<div className="mentions-popup-container">
					<AtMentionsPopup
						on={Boolean(this.state.currentPopup)}
						items={this.state.popupItems}
						prefix={this.state.popupPrefix}
						selected={this.state.selectedPopupItem}
						handleHoverAtMention={this.handleHoverAtMention}
						handleSelectAtMention={this.handleSelectAtMention}
					/>
				</div>
				<div key="message-attach-icons" className="message-attach-icons">
					<Icon
						key="mention"
						name="mention"
						title="Mention a teammate"
						placement="top"
						align={{ offset: [5, 0] }}
						delay={1}
						className={cx("mention", { hover: this.state.currentPopup === "at-mentions" })}
						onClick={this.handleClickAtMentions}
					/>
					<Icon
						key="smiley"
						name="smiley"
						title="Add a smiley"
						placement="top"
						align={{ offset: [5, 0] }}
						delay={1}
						className={cx("smiley", {
							hover: this.state.emojiOpen
						})}
						onClick={this.handleClickEmojiButton}
					/>
					{this.state.emojiOpen && (
						<EmojiPicker
							addEmoji={this.addEmoji}
							target={this.state.emojiMenuTarget}
							autoFocus={true}
						/>
					)}
					{this.props.relatedCodemarkIds && (
						<Icon
							key="codestream"
							name="codestream"
							title="Add a related codemark"
							placement="top"
							align={{ offset: [5, 0] }}
							delay={1}
							className={cx("codestream", { hover: this.state.codemarkOpen })}
							onClick={this.handleClickCodemarkButton}
						/>
					)}
					{this.buildCodemarkMenu()}
					{this.props.teamTags && (
						<Icon
							key="tag"
							name="tag"
							title="Add tags"
							placement="top"
							align={{ offset: [5, 0] }}
							delay={1}
							className={cx("tags", { hover: this.state.tagsOpen })}
							onClick={this.handleClickTagButton}
						/>
					)}
					{this.buildTagMenu()}
				</div>
				<ContentEditable
					className={cx("message-input", btoa(unescape(encodeURIComponent(placeholder || ""))), {
						// "has-plus": !this.props.multiCompose
					})}
					id="input-div"
					tabIndex={this.props.tabIndex}
					onChange={this.handleChange}
					onBlur={this.handleBlur}
					onClick={this.handleClick}
					html={text}
					placeholder={placeholder}
					ref={ref => (this._contentEditable = ref)}
				/>
			</div>
		);
	}
}

const mapStateToProps = state => {
	const currentTeam = state.teams[state.context.currentTeamId];

	return {
		currentTeam,
		codemarks: codemarkSelectors.getTypeFilteredCodemarks(state) || []
	};
};

export default connect(
	mapStateToProps,
	{ ...actions }
)(MessageInput);
