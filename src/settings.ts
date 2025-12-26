import {App, PluginSettingTab, Setting} from "obsidian";
import YandexDiskSyncPlugin from "./main";

export class YandexDiskSettingTab extends PluginSettingTab {

    plugin: YandexDiskSyncPlugin;
    constructor(app: App, plugin: YandexDiskSyncPlugin) { super(app, plugin); this.plugin = plugin; }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Настройки Yandex Disk Sync' });

        new Setting(containerEl)
            .setName('OAuth Токен')
            .addText(text => text
                .setValue(this.plugin.settings.oauthToken)
                .onChange(async (v) => { this.plugin.settings.oauthToken = v.trim(); await this.plugin.saveSettings(); }));

        new Setting(containerEl)
            .setName('Папка на Диске')
            .addText(text => text
                .setValue(this.plugin.settings.remotePath)
                .onChange(async (v) => { this.plugin.settings.remotePath = v.trim(); await this.plugin.saveSettings(); }));
    }

}
