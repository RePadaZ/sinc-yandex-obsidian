export interface YandexDiskSettings {
	oauthToken: string;
	remotePath: string;
}

export const DEFAULT_SETTINGS: YandexDiskSettings = {
	oauthToken: '',
	remotePath: 'ObsidianSync'
}
