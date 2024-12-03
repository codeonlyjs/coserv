#!/usr/bin/env node

import path from 'node:path';
import url from 'node:url';
import express from 'express';
import 'express-async-errors';
import livereload from 'livereload';
import logger from "morgan";
import merge from "deepmerge";
import { bundleFree } from '@codeonlyjs/bundle-free';
import { clargs, showArgs, showPackageVersion } from "@toptensoftware/clargs";


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
        "-p, --port:<port>": "Set server port",
        "    --host:<host>": "Set server host",
        "    --show-config": "Log final configuration",
        "-v, --version":     "Show version info",
        "-h, --help":        "Show this help",
        "    dir":           "Directory to serve files from (defaults to current)"
    });
}

let cl = {};
let args = clargs();
while (args.next())
{
    switch (args.name)
    {
        case "env":
            process.env.NODE_ENV = args.value;
            break;

        case "show-config":
            cl.showConfig = args.boolValue;
            break;

        case "p":
        case "port":
            cl.port = args.intValue;
            break;

        case "host":
            cl.host = args.value;
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
            process.chdir(args.value);
            break;

        default:
            console.log(`Unknown command line option '${args.name}'`);
            process.exit(7);
    }
}

// Setup app
let app = express(); 

// Default config
let defaultConfig = 
{
    port: 3000,
    host: null,
    development: 
    {
        logging: "dev",
        bundleFree: {
            path: ".",
            spa: true,
            node_modules: "./node_modules",
            inYaFace: true,
        },
        livereload: {
            options: {
            },
            watch: [
                ".",
            ]
        }
    },
    production: 
    {
        logging: "combined",
        bundleFree: {
            path: "./dist",
            spa: true,
        }
    }
}

// Import config
let configRaw = (await import("file://" + path.resolve("coserv.config.js"))).default;

let config = merge.all([
    defaultConfig,
    defaultConfig[app.get('env')],
    configRaw[app.get('env')] ?? {},
    cl,
]);
delete config.development;
delete config.production;

    
if (cl.showConfig)
    console.log(JSON.stringify(config, null, 4));

// Enable logging
console.log(`Running as ${app.get('env')}`);
if (config.logging)
    app.use(logger(config.logging));

// Automatically turn on bundle free live reload flag?
if (config.livereload && config.bundleFree.livereload === undefined)
    config.bundleFree.livereload = true;

// Bundle free
app.use(bundleFree(config.bundleFree));

// Load reload?
if (config.livereload)
{
    // Live reload
    let lrs = livereload.createServer(config.livereload.options ?? {});
    lrs.watch(config.livereload.watch);
}

// Not found
app.use((req, res, next) => {
    let err = new Error(`Not Found - ${req.originalUrl}`);
    err.status = 404;
    next(err);
});

// Start server
let server = app.listen(config?.port ?? 3000, config?.host, function () {
    console.log(`Server running on [${server.address().address}]:${server.address().port}`);
});


