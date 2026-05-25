import {Logger} from "@/controller/Logger";
import {MockDataView, MockPage} from "@tests/mock.test";
import test from "node:test";

const dv = new MockDataView(MockPage.of("Me"));
const logger = new Logger(dv, "Classname");

test("Test", async () => {
    logger.log("Hello", 3, { hello: "world" });
})