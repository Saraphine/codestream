"use strict";

import { expect } from "chai";
import { GitLabEnterpriseProvider } from "../../../../src/providers/gitlabEnterprise";
require("mocha").describe;
require("mocha").it;

describe("getOwnerFromRemote", () => {
	const provider = new GitLabEnterpriseProvider({} as any, {} as any);

	it("without gitlab subdir", () => {
		const owner = provider.getOwnerFromRemote("//gitlab/gitlab/myrepo");
		expect(owner).to.be.deep.eq({ name: "myrepo", owner: "gitlab" });
	});

	it("with gitlab subdir", () => {
		const owner = provider.getOwnerFromRemote("//gitlab/gitlab/something/myrepo");
		expect(owner).to.be.deep.eq({ name: "myrepo", owner: "something" });
	});

	it("with gitlab subdir and project", () => {
		const owner = provider.getOwnerFromRemote("//gitlab/gitlab/foo/something/myrepo");
		expect(owner).to.be.deep.eq({ name: "myrepo", owner: "foo/something" });
	});
});
