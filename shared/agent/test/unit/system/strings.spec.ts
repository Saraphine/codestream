import { expect } from "chai";
require("mocha").describe;
require("mocha").it;
import { uniq } from "lodash-es";
import { Strings } from "../../../src/system/string";

describe("strings.ts", () => {
	describe("normalizePath", () => {
		it("can normalize a variety of OS-specific paths (windows)", async function() {
			const unique = uniq(
				[
					"c:/foo/bar",
					"c:/foo/bar/",
					// this can only be run on windows
					// "C:/foo/bar",
					"c:\\foo\\bar",
					"c:\\foo\\bar\\"
					// this can only be run on windows
					// "C:\\foo\\bar\\"
				].map(_ => Strings.normalizePath(_))
			);
			expect(unique.length).to.eq(1);
			expect(unique[0]).to.equal("c:/foo/bar");
		});

		it("can normalize a variety of OS-specific paths (mac/linux)", async function() {
			const unique = uniq(
				["/users/foo/bar", "/users/foo/bar/", "\\users\\foo\\bar", "\\users\\foo\\bar\\"].map(_ =>
					Strings.normalizePath(_)
				)
			);
			expect(unique.length).to.eq(1);
			expect(unique[0]).to.equal("/users/foo/bar");
		});
	});

	describe("trimEnd", () => {
		it("has a trailing slash", () => {
			expect(Strings.trimEnd("https://codestream.com/", "/")).to.equal("https://codestream.com");
		});

		it("has a trailing ?", () => {
			expect(Strings.trimEnd("https://codestream.com/?", "?")).to.equal("https://codestream.com/");
		});
	});

	describe("trimStart", () => {
		it("has a front dot", () => {
			expect(Strings.trimStart(".", ".")).to.equal("");
			expect(Strings.trimStart("..", ".")).to.equal(".");
			expect(Strings.trimStart("/foo", ".")).to.equal("/foo");
			expect(Strings.trimStart("../foo", ".")).to.equal("./foo");
			expect(Strings.trimStart("./foo", ".")).to.equal("/foo");
		});
	});

	describe("asPartialPaths", () => {
		it("good", () => {
			expect(Strings.asPartialPaths("main.js")).to.deep.equal(["main.js"]);
			expect(Strings.asPartialPaths("foo.bar.js")).to.deep.equal(["foo.bar.js"]);
			expect(Strings.asPartialPaths("/users/test/foo/bar/main.js")).to.deep.equal([
				"users/test/foo/bar/main.js",
				"test/foo/bar/main.js",
				"foo/bar/main.js",
				"bar/main.js",
				"main.js"
			]);
			expect(Strings.asPartialPaths("/users/test/foo/bar/main.js")).to.deep.equal([
				"users/test/foo/bar/main.js",
				"test/foo/bar/main.js",
				"foo/bar/main.js",
				"bar/main.js",
				"main.js"
			]);
		});

		it("bad", () => {
			expect(Strings.asPartialPaths("")).to.deep.equal([]);
		});
	});
});
