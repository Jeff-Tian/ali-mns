/// <reference path="Interfaces.ts" />
/// <reference path="Topic.ts" />
/// <reference path="OpenStack.ts" />

// The Subscription
import {OpenStack} from "./OpenStack";
import {Topic} from "./Topic";
import {ISubscription} from "./Interfaces";

import debug0 from "debug"
import Util from "util";

const debug = debug0('ali-mns');

export class Subscription implements ISubscription {
    // The constructor. name & topic is required.
    constructor(name: string, topic: Topic) {
        this._name = name;
        this._topic = topic;

        // make url
        this._urlAttr = this.makeAttrURL();

        // create the OpenStack object
        this._openStack = new OpenStack(topic.getAccount());
    }

    public getName() {
        return this._name;
    }

    public getTopic() {
        return this._topic;
    }

    // 获取Subscription的属性值
    public getAttrsP() {
        debug("GET " + this._urlAttr);
        return this._openStack.sendP("GET", this._urlAttr);
    }

    // 设置Subscription的属性值
    public setAttrsP(options: any) {
        var body = {Subscription: options};
        debug("PUT " + this._urlAttr, body);
        return this._openStack.sendP("PUT", this._urlAttr + "?metaoverride=true", body);
    }

    public static NotifyStrategy = {
        BACKOFF_RETRY: "BACKOFF_RETRY",
        EXPONENTIAL_DECAY_RETRY: "EXPONENTIAL_DECAY_RETRY"
    };

    public static NotifyContentFormat = {
        XML: "XML",
        SIMPLIFIED: "SIMPLIFIED"
    };

    private makeAttrURL() {
        return Util.format(this._pattern,
            this._topic.getAccount().getHttps() ? "https" : "http",
            this._topic.getAccount().getAccountId(),
            this._topic.getRegion().toString(),
            this._topic.getName(),
            this._name);
    }

    protected _openStack: OpenStack;

    private _name: string;
    private _topic: Topic;
    private _urlAttr: string; // Subscription attr url
    private _pattern = "%s://%s.mns.%s.aliyuncs.com/topics/%s/subscriptions/%s";
}
