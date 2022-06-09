import { expect } from "chai";
require("mocha").describe;
require("mocha").it;
import { RepositoryMappingManager } from "../../../src/managers/repositoryMappingManager";

describe("repositoryMappingManager.spec.ts", () => {
	describe("normalizeUrl", () => {
		it("git@", async () => {
			const manager = new RepositoryMappingManager({} as any);
			const response = await manager.normalizeUrl({
				url: "git@gitlab.com:foobar.io/development/api/largerepo.git"
			});
			expect(response.normalizedUrl).to.equal("gitlab.com/foobar.io/development/api/largerepo");
		});
	});
});
