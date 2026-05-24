export interface ContainerConfig {
	host?: string;
	port?: number;
	username?: string;
	password?: string;
	debug?: boolean;
}

export interface ConnectionInfo {
	host: string;
	port: number;
	username: string;
	password: string;
}

export interface S3ConnectionInfo {
	endpoint: string;
	accessKey: string;
	secretKey: string;
	bucket: string;
	region: string;
}

export interface StartedContainerSet {
	sftp: ConnectionInfo;
	ftp: ConnectionInfo;
	scp: ConnectionInfo;
	s3: S3ConnectionInfo;
}
