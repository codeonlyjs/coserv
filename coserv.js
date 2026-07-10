#!/usr/bin/env node

import path from 'node:path';
import url from 'node:url';
import merge from "deepmerge";
import { clargs, showArgs, showPackageVersion } from "@toptensoftware/clargs";
import { serve } from "./serve.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

function showVersion()
{
    showPackageVersion(path.join(__dirname, "package.json"));
}

function showHelp()
{
    showVersion();

    console.log("\nUsage: npx codeonlyjs/coserv <options> [dir]");

    console.log("\nOptions:");
    showArgs({
        "    --env:<env>":   "Set NODE_ENV (typically development|production)",
        "    --dev":         "Shortcut for --env:development",
        "    --prod":        "Shortcut for --env:production",
        "-p, --port:<port>": "Set server port",
        "    --host:<host>": "Set server host",
        "    --show-config": "Log final configuration",
        "-v, --version":     "Show version info",
        "-h, --help":        "Show this help",
        "    <dir>":         "Change current working directory"
    });
}

let cl = {};
let args = clargs();
while (args.next())
{
    switch (args.name)
    {
        case "env":
            process.env.NODE_ENV = args.readValue();
            break;

        case "dev":
            process.env.NODE_ENV = "development";
            break;

        case "prod":
            process.env.NODE_ENV = "production";
            break;

        case "show-config":
            cl.showConfig = args.readBoolValue();
            break;

        case "p":
        case "port":
            cl.port = args.readIntValue();
            break;

        case "host":
            cl.host = args.readValue();
            break;

        case "v":
        case "version":
            showVersion();
            process.exit(0);

        case "h":
        case "help":
            showHelp();
            process.exit(0);

        case null:
            process.chdir(args.readValue());
            break;

        default:
            console.log(`Unknown command line option '${args.name}'`);
            process.exit(7);
    }
}


// Import config
let config = (await import("file://" + path.resolve("coserv.config.js"))).default;

// Merge configurations
config = merge.all([
    config,
    config[process.env.NODE_ENV ?? "development"] ?? {},
    cl,
], { arrayMerge: (d, s, opt) => s });

// Start serving
serve(config);