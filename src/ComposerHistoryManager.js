//@flow
/*
Copyright 2017 Aviral Dasgupta

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { Value } from 'slate';

import _clamp from 'lodash/clamp';

type MessageFormat = 'rich' | 'markdown';

class HistoryItem {

    // We store history items in their native format to ensure history is accurate
    // and then convert them if our RTE has subsequently changed format.
    value: Value;
    format: MessageFormat = 'rich';

    constructor(value: ?Value, format: ?MessageFormat) {
        this.value = value;
        this.format = format;
    }

    static fromJSON(obj: Object): HistoryItem {
        return new HistoryItem(
            Value.fromJSON(obj.value),
            obj.format,
        );
    }

    toJSON(): Object {
        return {
            value: this.value.toJSON(),
            format: this.format,
        };
    }
}

export default class ComposerHistoryManager {
    history: Array<HistoryItem> = [];
    prefix: string;
    lastIndex: number = 0;
    currentIndex: number = 0;

    constructor(roomId: string, prefix: string = 'mx_composer_history_') {
        this.prefix = prefix + roomId;

        // TODO: Performance issues?
        let item;
        for (; item = sessionStorage.getItem(`${this.prefix}[${this.currentIndex}]`); this.currentIndex++) {
            try {
                this.history.push(
                    HistoryItem.fromJSON(JSON.parse(item)),
                );
            } catch (e) {
                console.warn("Throwing away unserialisable history", e);
            }
        }
        this.lastIndex = this.currentIndex;
    }

    save(value: Value, format: MessageFormat) {
        const item = new HistoryItem(value, format);
        this.history.push(item);
        this.currentIndex = this.lastIndex + 1;
        sessionStorage.setItem(`${this.prefix}[${this.lastIndex++}]`, JSON.stringify(item.toJSON()));
    }

    getItem(offset: number): ?HistoryItem {
        this.currentIndex = _clamp(this.currentIndex + offset, 0, this.lastIndex - 1);
        const item = this.history[this.currentIndex];
        return item;
    }
}
