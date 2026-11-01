/**
 * 保存前脱敏：内网 IP、常见密码字段
 */
export function sanitizeMarkdown(text) {
	return String(text ?? "")
		.replace(/\b(?:10|172|192)\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, "x.x.x.x")
		.replace(/(password\s*[=:]\s*['"])[^'"]+(['"])/gi, "$1x$2")
		.replace(/\b([A-Z_]*(?:PASS|PASSWORD)[A-Z_]*\s*[=:]\s*)[^\s`]+/gi, "$1x")
		.replace(/\{\{PASSWORD_\w+\}\}/g, "x")
		.replace(/(mysql(?:\+pymysql)?:\/\/[^:\s/]+:)[^@\s]+@/gi, "$1x@")
		.replace(/(postgres(?:ql)?:\/\/[^:\s/]+:)[^@\s]+@/gi, "$1x@");
}
