package com.energy.checkin

import android.content.Context
import android.util.Log
import com.tencent.mm.opensdk.modelmsg.SendAuth
import com.tencent.mm.opensdk.openapi.IWXAPI
import com.tencent.mm.opensdk.openapi.WXAPIFactory
import kotlinx.coroutines.suspendCancellableCoroutine
import com.energy.checkin.model.UserInfo
import org.json.JSONObject
import java.net.URL
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * 微信移动应用登录（原生 OAuth）。
 *
 * 流程：
 *  1) 调起微信授权 -> 用户在微信确认 -> 微信回调 WXEntryActivity.onResp 拿到 code。
 *  2) 用 code 调微信接口换取 access_token / openid / unionid。
 *
 * 关键点：unionid 只有在「移动应用」与小程序、公众号绑定到【同一微信开放平台】时才与另外两端一致。
 * 否则拿到的 unionid 不同，四端数据无法合并（这是最常见的坑）。
 */
object WeChatLoginHelper {

    private const val TAG = "WeChatLogin"
    private var api: IWXAPI? = null
    private var pendingCallback: ((Result<UserInfo>) -> Unit)? = null

    private fun getApi(ctx: Context): IWXAPI {
        if (api == null) {
            api = WXAPIFactory.createWXAPI(ctx.applicationContext, Constants.WECHAT_APP_ID, true)
            api!!.registerApp(Constants.WECHAT_APP_ID)
        }
        return api!!
    }

    /** 发起微信授权（在 UI 线程调用）。结果通过回调返回。 */
    fun login(ctx: Context, callback: (Result<UserInfo>) -> Unit) {
        pendingCallback = callback
        val wxApi = getApi(ctx)
        if (!wxApi.isWXAppInstalled) {
            pendingCallback = null
            callback(Result.failure(IllegalStateException("未安装微信客户端")))
            return
        }
        val req = SendAuth.Req().apply {
            scope = "snsapi_userinfo"
            state = "energy_checkin_" + System.currentTimeMillis()
        }
        wxApi.sendReq(req)
    }

    /** 供 WXEntryActivity 在拿到 code 后调用。 */
    fun onWeChatResp(code: String?) {
        if (code == null) {
            val cb = pendingCallback
            pendingCallback = null
            cb?.invoke(Result.failure(IllegalStateException("微信授权被取消或失败")))
            return
        }
        Thread {
            try {
                val url = "https://api.weixin.qq.com/sns/oauth2/access_token" +
                        "?appid=${Constants.WECHAT_APP_ID}" +
                        "&secret=${Constants.WECHAT_APP_SECRET}" +
                        "&code=$code" +
                        "&grant_type=authorization_code"
                val json = URL(url).readText()
                val obj = JSONObject(json)
                if (obj.has("errcode")) {
                    throw IllegalStateException("微信换 token 失败: $json")
                }
                val openid = obj.getString("openid")
                val unionid = if (obj.has("unionid")) obj.getString("unionid") else openid
                val accessToken = obj.optString("access_token", "")
                Log.d(TAG, "login ok openid=$openid unionid=$unionid")
                val cb = pendingCallback
                pendingCallback = null
                cb?.invoke(Result.success(UserInfo(openid, unionid, accessToken)))
            } catch (e: Exception) {
                Log.e(TAG, "login error", e)
                val cb = pendingCallback
                pendingCallback = null
                cb?.invoke(Result.failure(e))
            }
        }.start()
    }

    /** 协程友好的登录封装。 */
    suspend fun loginSuspend(ctx: Context): UserInfo = suspendCancellableCoroutine { cont ->
        login(ctx) { result ->
            result.onSuccess { cont.resume(it) }
                  .onFailure { cont.resumeWithException(it) }
        }
    }
}
