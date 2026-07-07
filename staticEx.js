import express from 'express';
import mime from 'mime-types';

if (mime.types.md === undefined)
    mime.types.md = 'text/markdown';

export function staticEx(basedir, options)
{
    const staticMiddleware = express.static(basedir, options);

    return function(req, res, next)
    {
        staticMiddleware(req, res, function(err) {

            if (err)
                return next(err);
            
            // If spa enabled, then try again with the root url
            if (options.spa && req.url !== "/")
            {
                req.url = "/";
                staticMiddleware(req, res, next);
            }
            else
            {
                next(err);
            }
        });

    };
}