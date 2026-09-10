// Barrel file to ensure the order of these imports is correct
import "zod/compile";
// zod/compile must come before modules that define schemas
import * as z from "zod";

export { z as default };
