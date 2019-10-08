package com.codestream.authentication

import com.codestream.agent.ApiVersionCompatibility
import com.codestream.agent.DidChangeApiVersionCompatibilityNotification
import com.codestream.agentService
import com.codestream.codeStream
import com.codestream.extensions.merge
import com.codestream.gson
import com.codestream.protocols.webview.DidChangeApiVersionCompatibility
import com.codestream.sessionService
import com.codestream.settings.ApplicationSettingsService
import com.codestream.settingsService
import com.codestream.webViewService
import com.github.salomonbrys.kotson.fromJson
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.intellij.credentialStore.Credentials
import com.intellij.ide.passwordSafe.PasswordSafe
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.ServiceManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import kotlinx.coroutines.future.await
import protocols.agent.LoginResult
import protocols.agent.LoginWithTokenParams
import protocols.webview.BootstrapResponse
import protocols.webview.Capabilities
import protocols.webview.Ide
import protocols.webview.UserSession

class AuthenticationService(val project: Project) {

    private val extensionCapabilities: JsonElement get() = gson.toJsonTree(Capabilities())
    private val appSettings = ServiceManager.getService(ApplicationSettingsService::class.java)

    private val logger = Logger.getInstance(AuthenticationService::class.java)
    private var mergedCapabilities: JsonElement = extensionCapabilities
    private var apiVersionCompatibility: ApiVersionCompatibility? = null
    private var missingCapabilities: JsonObject? = null

    fun bootstrap(): Any? {
        val settings = project.settingsService ?: return Unit
        val session = project.sessionService ?: return Unit

        return BootstrapResponse(
            UserSession(session.userLoggedIn?.userId),
            mergedCapabilities,
            appSettings.webViewConfigs,
            settings.getWebViewContextJson(),
            appSettings.extensionInfo.versionFormatted,
            Ide(appSettings.ideInfo.name),
            apiVersionCompatibility,
            missingCapabilities
        )
    }

    suspend fun autoSignIn(): Boolean {
        val settings = project.settingsService ?: return true
        if (!appSettings.autoSignIn) return true
        val tokenStr = PasswordSafe.instance.getPassword(appSettings.credentialAttributes) ?: return true
        val agent = project.agentService?.agent ?: return true

        try {
            val token = gson.fromJson<JsonObject>(tokenStr)
            val loginResult =
                agent.loginToken(
                    LoginWithTokenParams(
                        token,
                        settings.state.teamId,
                        appSettings.team
                    )
                ).await()

            return if (loginResult.error != null) {
                logger.warn(loginResult.error)
                settings.state.teamId = null
                saveAccessToken(null)
                false
            } else {
                completeLogin(loginResult)
                true
            }
        } catch (err: Exception) {
            logger.warn(err)
            return false
        }
    }

    fun completeLogin(result: LoginResult) {
        if (project.sessionService?.userLoggedIn == null) {
            result.state?.let {
                mergedCapabilities = extensionCapabilities.merge(it.capabilities)
                project.settingsService?.state?.teamId = it.teamId
                saveAccessToken(it.token)
            }
            project.sessionService?.login(result.userLoggedIn)
        }
    }

    suspend fun logout() {
        val agent = project.agentService ?: return
        val session = project.sessionService ?: return
        val settings = project.settingsService ?: return

        session.logout()
        agent.restart()
        settings.state.teamId = null
        saveAccessToken(null)
    }

    fun onApiVersionChanged(notification: DidChangeApiVersionCompatibilityNotification) {
        apiVersionCompatibility = notification.compatibility
        if (notification.compatibility == ApiVersionCompatibility.API_UPGRADE_RECOMMENDED) {
            missingCapabilities = notification.missingCapabilities
        }

        project.webViewService?.postNotification(DidChangeApiVersionCompatibility())
        if (notification.compatibility != ApiVersionCompatibility.API_COMPATIBLE) {
            ApplicationManager.getApplication().invokeLater {
                project.codeStream?.show()
            }
        }
    }

    private fun saveAccessToken(accessToken: JsonObject?) {
        val credentials = accessToken?.let {
            Credentials(null, it.toString())
        }

        PasswordSafe.instance.set(
            appSettings.credentialAttributes,
            credentials
        )
    }
}
