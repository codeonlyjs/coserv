#!/usr/bin/env node

import path from 'node:path';
import express from 'express';
import 'express-async-errors';
import livereload from 'livereload';
import logger from "morgan";
import merge from "deepmerge";
import { bundleFreeMiddleware } from '@codeonlyjs/bundle-free';
import { staticEx } from "./staticEx.js"

export function serve(config)
{
    // Setup app
    let app = express(); 

    // Config Defaults
    let defaultConfig = 
    {
        port: 3000,
        host: null,
        serve: [
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

    // Merge configurations
    config = merge.all([
        defaultConfig,
        defaultConfig[app.get('env')],
        config,
    ], { arrayMerge: (d, s, opt) => s });
    delete config.development;
    delete config.production;

    // If watch specified, also load live reload
    if (config.watch && config.livereload === undefined)
        config.livereload = {};

    // If config.spa set then make sure at least one static path has spa option
    // set and if not, set it on the last one
    if (config.spa && config.serve && config.serve.length > 0 && config.serve.every(x => !x.spa))
    {
        config.serve[config.serve.length - 1].spa = true;
        delete config.spa;
    }

    // Show config?
    if (config.showConfig)
        console.log(JSON.stringify(config, null, 4));

    // Enable logging?
    console.log(`Running as ${app.get('env')}`);
    if (config.logging)
        app.use(logger(config.logging));

    // Bundle free
    app.use(bundleFreeMiddleware(config));

    // Serve 
    for (let s of config.serve)
    {
        if (s.path)
        {
            app.use(s.url, staticEx(path.resolve(config.baseDir, s.path), s));
            continue;
        }

        if (s.handler)
        {
            app.use(s.url, s.handler);
            continue;
        }

        if (s.json)
        {
            app.use(s.url, (req, res) => res.json(s.json));
            continue;
        }

        if (s.text)
        {
            app.use(s.url, (req, res) => {
                res.set('Content-Type', s.contentType ?? 'text/plain');
                res.send(s.text)
            });
            continue;
        }

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
}

