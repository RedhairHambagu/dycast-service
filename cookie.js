// nginx njs 模块：从 _dc 查询参数提取 Cookie，做两次 URL 解码（与 Vite proxy 行为一致）
// Vite: searchParams.get('_dc') 解码一次 + decodeURIComponent() 再解码一次
// nginx $arg__dc 不解码，所以这里需要解码两次
function getDecodedCookie(r) {
    var dc = r.variables['arg__dc'];
    if (dc && dc.length > 0) {
        try {
            // 第一次解码：%257C → %7C
            var once = decodeURIComponent(dc);
            // 第二次解码：%7C → |
            return decodeURIComponent(once);
        } catch (e) {
            return dc;
        }
    }
    return r.headersIn['Cookie'] || '';
}

export default { getDecodedCookie };
