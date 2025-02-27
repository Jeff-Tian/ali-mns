/// <reference path="Interfaces.ts" />
/// <reference path="Region.ts" />

    import {MNS} from "./MNS";
import {IMNSTopic} from "./Interfaces";
import {Region} from "./Region";
import {Account} from './Account';

import debug0 from "debug"
import Url from "url";
import Util from "util";
const debug = debug0('ali-mns');

export class MNSTopic extends MNS implements IMNSTopic {
        public constructor(account:Account, region?:string|Region){
            super(account, region);
            // make url
            this._urlTopic = this.makeTopicURL();
        }

        // List all topics.
        public listTopicP(prefix?:string, pageSize?:number, pageMarker?:string){
            var headers = {};
            if(prefix)      headers["x-mns-prefix"] = prefix;
            if(pageMarker)  headers["x-mns-marker"] = pageMarker;
            if(pageSize)    headers["x-mns-ret-number"] = pageSize;
            var url = this._urlTopic.slice(0, -1);
            debug("GET " + url);
            return this._openStack.sendP("GET", url, null, headers);
        }

        // Create a topic
        public createTopicP(name:string, options?:any){
            var body = { Topic: "" };
            if(options) body.Topic = options;
            var url = Url.resolve(this._urlTopic, name);
            debug("PUT " + url, body);
            return this._openStack.sendP("PUT", url, body);
        }

        // Delete a topic
        public deleteTopicP(name:string){
            var url = Url.resolve(this._urlTopic, name);
            debug("DELETE " + url);
            return this._openStack.sendP("DELETE", url);
        }

        private makeTopicURL(){
            return Util.format(this._patternTopic,
                this._account.getHttps()?"https":"http",
                this._account.getAccountId(),
                this._region.toString());
        }

        private _patternTopic = "%s://%s.mns.%s.aliyuncs.com/topics/";
        private _urlTopic:string;
    }
