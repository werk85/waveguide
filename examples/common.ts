// Copyright 2019 Ryan Zeigler
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// This is a file for code that has already been introduced in example modules
// so it is only replicated 2x

import * as wave from "../src/io";
import { IO } from "../src/io";
import { Resource } from "../src/resource";
import * as fs from "fs";
import { left, right } from "fp-ts/lib/Either";
import { ExitTag } from "../src/exit";

// main from overview.ts
import { makeDriver } from "../src/driver";
export function main(io: IO<never, void>): void {
    // We need a driver to run the io
    const driver = makeDriver<wave.DefaultR, never, void>();
    // If we receive signals, we should interrupt
    // These will cause the runloop to switch to its interrupt handling
    process.on("SIGINT", () => driver.interrupt());
    process.on("SIGTERM", () => driver.interrupt());
    // If the driver exits, we should terminate the process
    driver.onExit((e) => {
        // We don't worry about the raise case because the type of main says you must have handled your errors
        if (e._tag === ExitTag.Abort) {
            process.exit(1);
        } else {
            process.exit(0);
        }
    });
    driver.start({}, io);
}

/** open/close/write from overview.ts */
export const openFile = (path: string, flags: string): IO<NodeJS.ErrnoException, number> => wave.uninterruptible(
    wave.async((callback) => {
        fs.open(path, flags, 
            (err, fd) => {
                if (err) {
                    callback(left(err))
                } else {
                    callback(right(fd))
                }
            }
        )
        return () => {};
    }));


/**
 * Here we close a file handle
 */
export const closeFile = (handle: number): IO<NodeJS.ErrnoException, void> => wave.uninterruptible(
    wave.async((callback) => {
        fs.close(handle, (err) => {
            if (err) {
                callback(left(err))
            } else {
                callback(right(undefined))
            }
        })
        return () => {};
    }));

/**
 * We can also use a file handle to write content
 */
export const write = (handle: number, content: Buffer, ct: number): IO<NodeJS.ErrnoException, number> => wave.uninterruptible(
    wave.async((callback) => {
        fs.write(handle, content, 0, ct, (err, written) => {
            if (err) {
                callback(left(err))
            } else {
                callback(right(written));
            }
        })
        return () => {};
    })
)

export const read = (handle: number, length: number): IO<NodeJS.ErrnoException, [Buffer, number]> => wave.uninterruptible(
    // Here we see suspended, which is how we can 'effectfully' create an IO to run
    // In this case we allocate a mutable buffer inside suspended
    wave.suspended(() => {
        const buffer = Buffer.alloc(length);
        return wave.async((callback) => {
            fs.read(handle, buffer, 0, length, null, (err, ct, buffer) => {
                if (err)
                    callback(left(err));
                else
                    callback(right([buffer, ct]));
            })
            return () => {};
        });
    })
)


import * as https from "https"
import * as http from "http";
import * as resource from "../src/resource";
import { RIO } from "../src/io";
    
export const agent: Resource<never, https.Agent> = resource.bracket(
    wave.sync(() => new https.Agent()),
    (agent) => wave.sync(() => agent.destroy())
);
    
    /**
     * We can think of an IncomingMessage as something we can produce if we have an agent resource
     * @param url 
     */
export function fetch(url: string): RIO<https.Agent, Error, Buffer> {
    return wave.encaseReader((agent: https.Agent) => {
        const options = {agent};
        return wave.async<Error, Buffer>((callback) => {
            let cancelled = false;
            let response: http.IncomingMessage | undefined;
            http.get(url, options, (res) => {
                response = res;
                let buffers: Buffer[] = [];
                res.on("data", (chunk) => {
                    buffers.push(chunk);
                })
                res.on("end", () => {
                    if (!cancelled) {
                        callback(right(Buffer.concat(buffers)))
                    }
                });
                res.on("error", (e) => {
                    if (!cancelled) {
                        callback(left(e));
                    }
                });
            });
            return () => {
                cancelled = true;
                if (response) {
                    response.destroy();
                }
            };
        })
    })
}

export const now = wave.sync(() => process.hrtime.bigint());

/**
 * We also want a way of wrapping an IO so that we can see how long its execution took
 */
export function time<R, E, O>(io: RIO<R, E, O>): RIO<R, E, readonly [O, bigint]> {
    // zipWith, zip happen in order with no parallelism
    return wave.zipWith(
        now,
        wave.zip(io, now),
        (start, [o, end]) => [o, end - start] as const
    );
}

    