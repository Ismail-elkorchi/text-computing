import assert from "node:assert/strict";
import { applyDown, compileRewrite } from "../../dist/index.js";

assert.equal(applyDown(compileRewrite("ph -> f"), "ph")[0]?.output, "f");
