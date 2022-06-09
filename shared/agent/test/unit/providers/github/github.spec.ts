"use strict";

import { expect } from "chai";
import { GitHubProvider } from "../../../../src/providers/github";
require("mocha").describe;
require("mocha").it;

describe("getOwnerFromRemote", () => {
	const provider = new GitHubProvider({} as any, {} as any);

	it("generic", () => {
		const owner = provider.getOwnerFromRemote("//github.com/foo/bar");
		expect(owner).to.be.deep.eq({ name: "bar", owner: "foo" });
	});
});
