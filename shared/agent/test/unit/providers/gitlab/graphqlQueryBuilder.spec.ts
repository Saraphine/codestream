"use strict";

import { expect } from "chai";
require("mocha").describe;
require("mocha").it;
import { GraphqlQueryBuilder } from "../../../../src/providers/gitlab/graphqlQueryBuilder";
import mergeRequest0Query from "../../../../src/providers/gitlab/mergeRequest0.graphql";

const gitlabGraphqlQueryBuilder = new GraphqlQueryBuilder("gitlab*com");

describe("graphqlQueryBuilder-gitlab", async () => {
	it("build-14.5.0", async () => {
		const results = await gitlabGraphqlQueryBuilder.build(
			"14.5.0",
			mergeRequest0Query,
			"GetPullRequest"
		);
		expect(results.indexOf("draft")).to.be.greaterThan(-1);
	});

	it("build-13.6.1", async () => {
		const results = await gitlabGraphqlQueryBuilder.build(
			"13.6.1",
			mergeRequest0Query,
			"GetPullRequest"
		);
		expect(results.indexOf("draft")).to.equals(-1);
	});
});
