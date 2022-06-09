import { ApiVersioningState } from "./apiVersioning/types";
import { applyMiddleware, createStore } from "redux";
import { combineReducers } from "redux";
import { batchedSubscribe } from "redux-batched-subscribe";
import { composeWithDevTools } from "redux-devtools-extension";
import thunk from "redux-thunk";
import { reduceApiVersioning } from "../store/apiVersioning/reducer";
import { reduceCapabilities, CapabilitiesState } from "../store/capabilities/reducer";
import { reduceCodemarks } from "../store/codemarks/reducer";
import { reduceCodeErrors } from "../store/codeErrors/reducer";
import { reduceConfigs } from "../store/configs/reducer";
import { reduceConnectivity } from "../store/connectivity/reducer";
import { reduceContext } from "../store/context/reducer";
import { reduceProviders } from "../store/providers/reducer";
import { reduceIde } from "./ide/reducer";
import { reducePosts } from "../store/posts/reducer";
import { reducePreferences } from "../store/preferences/reducer";
import { reduceRepos } from "../store/repos/reducer";
import { reduceServices } from "../store/services/reducer";
import { reduceSession } from "../store/session/reducer";
import { reduceVersioning } from "../store/versioning/reducer";
import { SessionState } from "../store/session/types";
import { reduceStreams } from "../store/streams/reducer";
import { reduceTeams } from "../store/teams/reducer";
import { reduceUnreads } from "../store/unreads/reducer";
import { reduceUsers } from "../store/users/reducer";
import { reduceDocumentMarkers } from "../store/documentMarkers/reducer";
import { debounceToAnimationFrame } from "../utils";
import middleware from "./middleware";
import { reduceEditorContext } from "./editorContext/reducer";
import { CodeErrorsState } from "./codeErrors/types";
import { CodemarksState } from "./codemarks/types";
import { ConfigsState } from "./configs/types";
import { ConnectivityState } from "./connectivity/types";
import { ContextState } from "./context/types";
import { DocumentMarkersState } from "./documentMarkers/types";
import { EditorContextState } from "./editorContext/types";
import { IdeState } from "./ide/types";
import { PostsState } from "./posts/types";
import { PreferencesState } from "./preferences/types";
import { ReposState } from "./repos/types";
import { ReviewsState } from "./reviews/types";
import { StreamsState } from "./streams/types";
import { TeamsState } from "./teams/types";
import { UnreadsState } from "./unreads/types";
import { UsersState } from "./users/types";
import { ServicesState } from "./services/types";
import { ProvidersState } from "./providers/types";
import { reduceBootstrapped } from "./bootstrapped/reducer";
import { VersioningState } from "./versioning/types";
import { ActiveIntegrationsState } from "./activeIntegrations/types";
import { reduceActiveIntegrations } from "./activeIntegrations/reducer";
import { reduceActivityFeed } from "./activityFeed/reducer";
import { ActivityFeedState } from "./activityFeed/types";
import { reduceCompanies } from "./companies/reducer";
import { CompaniesState } from "./companies/types";
import { reduceDocuments } from "./documents/reducer";
import { DocumentsState } from "./documents/types";
import { reduceReviews } from "./reviews/reducer";
import { reduceProviderPullRequests } from "./providerPullRequests/reducer";
import { ProviderPullRequestsState } from "./providerPullRequests/types";
import { reduceDynamicLogging } from "./dynamicLogging/reducer";
import { DynamicLoggingState } from "./dynamicLogging/types";

const pluginVersion = (state = "", action) => {
	if (action.type === "@pluginVersion/Set") return action.payload;
	return state;
};

const reducer = combineReducers({
	activeIntegrations: reduceActiveIntegrations,
	activityFeed: reduceActivityFeed,
	bootstrapped: reduceBootstrapped,
	capabilities: reduceCapabilities,
	codemarks: reduceCodemarks,
	companies: reduceCompanies,
	configs: reduceConfigs,
	connectivity: reduceConnectivity,
	context: reduceContext,
	documents: reduceDocuments,
	documentMarkers: reduceDocumentMarkers,
	editorContext: reduceEditorContext,
	ide: reduceIde,
	pluginVersion,
	posts: reducePosts,
	preferences: reducePreferences,
	repos: reduceRepos,
	reviews: reduceReviews,
	session: reduceSession,
	streams: reduceStreams,
	teams: reduceTeams,
	umis: reduceUnreads,
	users: reduceUsers,
	services: reduceServices,
	providers: reduceProviders,
	versioning: reduceVersioning,
	apiVersioning: reduceApiVersioning,
	providerPullRequests: reduceProviderPullRequests,
	codeErrors: reduceCodeErrors,
	dynamicLogging: reduceDynamicLogging
});

export function createCodeStreamStore(
	initialState: any = {},
	thunkArg: any = {},
	consumerMiddleware: any[] = []
) {
	return createStore(
		reducer,
		initialState,
		composeWithDevTools(
			applyMiddleware(thunk.withExtraArgument(thunkArg), ...middleware, ...consumerMiddleware),
			batchedSubscribe(debounceToAnimationFrame((notify: Function) => notify())) as any
		)
	);
}

// it's a good idea to keep this sorted alphabetically for debugging purposes
export interface CodeStreamState {
	activeIntegrations: ActiveIntegrationsState;
	activityFeed: ActivityFeedState;
	apiVersioning: ApiVersioningState;
	bootstrapped: boolean;
	capabilities: CapabilitiesState;
	codemarks: CodemarksState;
	configs: ConfigsState;
	companies: CompaniesState;
	connectivity: ConnectivityState;
	context: ContextState;
	documents: DocumentsState;
	documentMarkers: DocumentMarkersState;
	editorContext: EditorContextState;
	ide: IdeState;
	pluginVersion: string;
	posts: PostsState;
	preferences: PreferencesState;
	providers: ProvidersState;
	providerPullRequests: ProviderPullRequestsState;
	repos: ReposState;
	reviews: ReviewsState;
	services: ServicesState;
	session: SessionState;
	streams: StreamsState;
	teams: TeamsState;
	umis: UnreadsState;
	users: UsersState;
	versioning: VersioningState;
	codeErrors: CodeErrorsState;
	dynamicLogging: DynamicLoggingState;
}
