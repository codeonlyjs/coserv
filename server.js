#!/usr/bin/env node

import path from 'node:path';
import url from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import 'express-async-errors';
import { bundleFree } from '@codeonlyjs/bundle-free';
import livereload from 'livereload';
import logger from "morgan";
import merge from "deepmerge";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

// Setup app
let app = express(); 

// Default config
let defaultConfig = 
{
    port: 3000,
    development: 
    {
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
        bundleFree: {
            path: "./dist",
            spa: true,
        }
    }
}

// Import config
let configRaw = (await import("file://" + path.resolve("serve.config.js"))).default;

let config = merge.all([
    defaultConfig,
    defaultConfig[app.get('env')],
    configRaw[app.get('env')] ?? {},
]);
delete config.development;
delete config.production;

console.log(JSON.stringify(config, null, 4));

// Cookie and body parsers
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Enable logging
console.log(`Running as ${app.get('env')}`);
if (app.get('env') === 'production')
    app.use(logger('combined'));
else
    app.use(logger('dev', { stream: { write: (m) => console.log(m.trimEnd()) } } ));

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


