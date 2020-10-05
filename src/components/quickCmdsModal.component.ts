import { Component } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { ConfigService, AppService, BaseTabComponent, SplitTabComponent } from 'terminus-core'
import { QuickCmds, ICmdGroup } from '../api'
import { TerminalTabComponent } from 'terminus-terminal';

@Component({
    template: require('./quickCmdsModal.component.pug'),
    styles: [require('./quickCmdsModal.component.scss')],
})
export class QuickCmdsModalComponent {
    cmds: QuickCmds[]
    quickCmd: string
    appendCR: boolean
    childGroups: ICmdGroup[]
    groupCollapsed: {[id: string]: boolean} = {}

    constructor (
        public modalInstance: NgbActiveModal,
        private config: ConfigService,
        private app: AppService,
    ) { }

    ngOnInit () {
        this.cmds = this.config.store.qc.cmds
        this.appendCR = true
        this.refresh()
    }

    quickSend () {
        for (let cmd of this.cmds)
        {
            if (this.elasticIncludes(cmd.name))
            {
                this._send(this.app.activeTab, cmd.text + (this.appendCR ? "\n" : ""))
                this.close()
                break;
            }
        }
    }

    quickSendAll() {
        this._sendAll(this.quickCmd + (this.appendCR ? "\n" : ""))
        this.close()
    }

    _send (tab: BaseTabComponent, cmd: string) {
        if (tab instanceof SplitTabComponent) {
            this._send((tab as SplitTabComponent).getFocusedTab(), cmd)
        }
        if (tab instanceof TerminalTabComponent) {
            let currentTab = tab as TerminalTabComponent
            console.log("Sending " + cmd);
            currentTab.sendInput(cmd)
        }
    }

    _sendAll (cmd: string) {
        for (let tab of this.app.tabs) {
            if (tab instanceof SplitTabComponent) {
                for (let subtab of (tab as SplitTabComponent).getAllTabs()) {
                    this._send(subtab, cmd)
                }
            } else {
                this._send(tab, cmd)
            }
        }
    }

    close () {
        this.modalInstance.close()
        this.app.activeTab.emitFocused()
    }

    send (cmd: QuickCmds, event: MouseEvent) {
        if (event.ctrlKey) {
            this._sendAll(cmd.text + (cmd.appendCR ? "\n" : ""))
        }
        else {
            this._send(this.app.activeTab, cmd.text + (cmd.appendCR ? "\n" : ""))
        }
        this.close()
    }

    clickGroup (group: ICmdGroup, event: MouseEvent) {
        if (event.shiftKey) {
            if (event.ctrlKey) {
                for (let cmd of group.cmds) {
                    this._sendAll(cmd.text + (cmd.appendCR ? "\n" : ""))
                }
            }
            else {
                for (let cmd of group.cmds) {
                    this._send(this.app.activeTab, cmd.text + (cmd.appendCR ? "\n" : ""))
                }
            }
        }
        else {
            this.groupCollapsed[group.name] = !this.groupCollapsed[group.name]
        }
    }

    refresh () {
        this.childGroups = []

        let cmds = this.cmds
        if (this.quickCmd) {
            cmds = cmds.filter(cmd => this.elasticIncludes(cmd.name))
        }

        for (let cmd of cmds) {
            cmd.group = cmd.group || null
            let group = this.childGroups.find(x => x.name === cmd.group)
            if (!group) {
                group = {
                    name: cmd.group,
                    cmds: [],
                }
                this.childGroups.push(group)
            }
            group.cmds.push(cmd)
        }
    }

    private elasticIncludes(s: string)
    {
        let regexString = "";
        for (let inputLetter of this.quickCmd)
            regexString += inputLetter + ".*";
        let regexp = new RegExp(regexString);

        return regexp.test(s)
    }
}
