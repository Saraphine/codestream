"use strict";

import { expect } from "chai";

import { BitbucketProvider } from "../../../src/providers/bitbucket";
import { BitbucketServerProvider } from "../../../src/providers/bitbucketServer";
import { GitHubProvider } from "../../../src/providers/github";
import { GitHubEnterpriseProvider } from "../../../src/providers/githubEnterprise";
import { GitLabProvider } from "../../../src/providers/gitlab";
import { GitLabEnterpriseProvider } from "../../../src/providers/gitlabEnterprise";
import { ThirdPartyIssueProvider } from "../../../src/providers/provider";

require("mocha").describe;
require("mocha").it;

describe("provider", async () => {
	it("supportsViewingPullRequests", async () => {
		[GitHubProvider, GitHubEnterpriseProvider, GitLabProvider, GitLabEnterpriseProvider].forEach(
			Provider => {
				const provider = new Provider({} as any, Provider as any);
				expect(ThirdPartyIssueProvider.supportsViewingPullRequests(provider)).to.eq(true);
			}
		);
	});

	it("does not supportsViewingPullRequests", async () => {
		[BitbucketProvider, BitbucketServerProvider].forEach(Provider => {
			const provider = new Provider({} as any, Provider as any);
			expect(ThirdPartyIssueProvider.supportsViewingPullRequests(provider)).to.eq(false);
		});
	});

	it("supportsCreatingPullRequests", async () => {
		[
			GitHubProvider,
			GitHubEnterpriseProvider,
			GitLabProvider,
			GitLabEnterpriseProvider,
			BitbucketProvider,
			BitbucketServerProvider
		].forEach(Provider => {
			const provider = new Provider({} as any, Provider as any);
			expect(ThirdPartyIssueProvider.supportsCreatingPullRequests(provider)).to.eq(true);
		});
	});
});
