#!/usr/bin/env node

import path from 'node:path';
import url from 'node:url';
import express from 'express';
import 'express-async-errors';
import livereload from 'livereload';
import logger from "morgan";
import merge from "deepmerge";
import { bundleFreeMiddleware } from '@codeonlyjs/bundle-free';
import { clargs, showArgs, showPackageVersion } from "@toptensoftware/clargs";
import { staticEx } from "./staticEx.js"


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

// Setup app
let app = express(); 

// Config Defaults
let defaultConfig = 
{
    port: 3000,
    host: null,
    static: [
        { url: "/", path: "." },
    ],
    spa: true,
    development: 
    {
        baseDir: process.cwd(),
        logging: "dev",
        inYaFace: true,
        watch: [
            ".",
        ],
    },
    production: 
    {
        logging: "combined",
        baseDir: path.join(process.cwd(), "dist"),
    }
}

// Import config
let configRaw = (await import("file://" + path.resolve("coserv.config.js"))).default;

// Merge configurations
let config = merge.all([
    defaultConfig,
    defaultConfig[app.get('env')],
    configRaw,
    configRaw[app.get('env')] ?? {},
    cl,
], { arrayMerge: (d, s, opt) => s });
delete config.development;
delete config.production;

// If watch specified, also load live reload
if (config.watch && config.livereload === undefined)
    config.livereload = {};

// If config.spa set then make sure at least one static path has spa option
// set and if not, set it on the last one
if (config.spa && config.static && config.static.length > 0 && config.static.every(x => !x.spa))
{
    config.static[config.static.length - 1].spa = true;
    delete config.spa;
}

// Show config?
if (cl.showConfig)
    console.log(JSON.stringify(config, null, 4));

// Enable logging?
console.log(`Running as ${app.get('env')}`);
if (config.logging)
    app.use(logger(config.logging));

// Bundle free
app.use(bundleFreeMiddleware(config));

// Static files
for (let s of config.static)
{
    app.use(s.url, staticEx(path.join(config.baseDir, s.path), s));
}

// Load reload?
if (config.livereload)
{
    // Live reload
    let lrs = livereload.createServer(config.livereload);
    lrs.watch(config.watch);
}

// Not found handler
app.use((req, res, next) => {

    let err = new Error(`Not Found - ${req.originalUrl}`);
    err.status = 404;
    next(err);
});

// Start server
let server = app.listen(config?.port ?? 3000, config?.host, function () {
    console.log(`Server running on [${server.address().address}]:${server.address().port}`);
});


