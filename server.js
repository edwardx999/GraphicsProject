"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const app = express();
app.use(express.static('public'));
app.listen(3000);
//# sourceMappingURL=server.js.map