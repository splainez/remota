import type { ImgHTMLAttributes, SVGAttributes } from "react";
import { getFileIcon } from "@renderer/shared/icon-utils";
import { useFileIcon } from "@renderer/hooks/useFileIcon";
import { Icon } from "./Icon";

export interface FileIconProps extends SVGAttributes<SVGSVGElement> {
	path: string;
	size?: number | string;
	filePath?: string;
}

export function FileIcon({ path, filePath, size, className, ...rest }: FileIconProps) {
	const { icon } = useFileIcon(filePath);

	// console.log("FileIcon", icon, path, filePath);
	if (icon) {
		return (
			<img
				src={icon}
				width={size}
				height={size}
				className={className}
				{...(rest as ImgHTMLAttributes<HTMLImageElement>)}
			/>
		);
	}
	const name = getFileIcon(path);
	return <Icon {...rest} name={name} size={size} className={className} />;
}
