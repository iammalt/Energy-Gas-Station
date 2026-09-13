package com.energy.checkin.wxapi

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import com.energy.checkin.WeChatLoginHelper
import com.tencent.mm.opensdk.constants.ConstantsAPI
import com.tencent.mm.opensdk.modelbase.BaseReq
import com.tencent.mm.opensdk.modelbase.BaseResp
import com.tencent.mm.opensdk.modelmsg.SendAuth
import com.tencent.mm.opensdk.openapi.IWXAPI
import com.tencent.mm.opensdk.openapi.IWXAPIEventHandler
import com.tencent.mm.opensdk.openapi.WXAPIFactory

/**
 * 微信登录回调 Activity，包名与类名固定为 .wxapi.WXEntryActivity。
 * 微信授权结果（code）在此转发给 WeChatLoginHelper。
 */
class WXEntryActivity : Activity(), IWXAPIEventHandler {

    private lateinit var api: IWXAPI

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        api = WXAPIFactory.createWXAPI(this, com.energy.checkin.Constants.WECHAT_APP_ID, false)
        api.handleIntent(intent, this)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
        api.handleIntent(intent, this)
    }

    override fun onResp(resp: BaseResp) {
        if (resp.type == ConstantsAPI.COMMAND_SENDAUTH) {
            val code = (resp as? SendAuth.Resp)?.code
            WeChatLoginHelper.onWeChatResp(code)
        }
        finish()
    }

    override fun onReq(resp: BaseReq) {
        // 不需要处理请求
    }
}
