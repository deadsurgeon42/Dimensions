///<reference path="./typings/index.d.ts"/>
import * as http from 'http';

interface BlackListCache {
    isHostIP: boolean;
    expires: Date;
}

class Blacklist {
    static cache: Array<BlackListCache> = [];

    static checkIP(ip: string, key: string) {
        return new Promise<boolean>((resolve, reject) => {
            if (typeof this.cache[ip] !== 'undefined' && this.cache[ip].expires > Date.now()) {
                resolve(this.cache[ip].isHostIP);
                return;
            }

            http.get(`http://tools.xioax.com/networking/ip/${ip}/${key}`, (res) => {
                let data = "";
                res.on("data", (chunk) => {
                    data += chunk;
                });

                res.on("end", () => {
                    let resDetails: any;
                    try {
                        resDetails = JSON.parse(data);
                    } catch(e) {
                        reject(e);
                    }

                    if (resDetails.status !== 'success') {
                        reject(new Error("Invalid API call."));
                    } else {
                        let expireTime = Date.now();
                        expireTime += 1000 * 60 * 30;
                        this.cache[ip] = {
                            isHostIP: resDetails["host-ip"],
                            expires: expireTime
                        };
                        resolve(resDetails["host-ip"]);
                    }
                });
            }).on('error', (e) => {
                reject(e);
            });
        });
    }
}

export default Blacklist;