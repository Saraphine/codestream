"use strict";

import { expect } from "chai";
import { GitHubEnterpriseProvider } from "../../../../src/providers/githubEnterprise";
require("mocha").describe;
require("mocha").it;

describe("getOwnerFromRemote", () => {
	const provider = new GitHubEnterpriseProvider({} as any, {} as any);

	it("generic", () => {
		const owner = provider.getOwnerFromRemote("//github.acme.us/foo/bar");
		expect(owner).to.be.deep.eq({ name: "bar", owner: "foo" });
	});
});
