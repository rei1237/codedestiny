package com.codedestiny.app;

import android.app.Activity;
import android.os.Build;

import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.CreateCredentialResponse;
import androidx.credentials.CreateRestoreCredentialRequest;
import androidx.credentials.CreateRestoreCredentialResponse;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.GetRestoreCredentialOption;
import androidx.credentials.RestoreCredential;
import androidx.credentials.exceptions.ClearCredentialException;
import androidx.credentials.exceptions.CreateCredentialException;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.restorecredential.E2eeUnavailableException;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;

import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

/**
 * Zero-Tap Sign-In(Restore Credentials API) 네이티브 브리지 — Google Play 2027-04 요건.
 *
 * 이 플러그인은 자격증명을 만들고(create) 새 기기에서 되찾고(restore) 지우는(clear) 세 동작만 감싼다.
 * 요청/응답 JSON 은 WebAuthn 규격 그대로 통과시키며 **의미 해석은 하지 않는다** —
 * challenge 발급·공개키 등록·assertion 검증은 서버(후속 PR)의 몫이다.
 * 설계·흐름: docs/app-audit/ZERO_TAP_SIGNIN_DESIGN.md
 *
 * 동작 조건(문서 실측): Android 9(API 28)+, Google Play services, 사용자 Google 계정·백업 ON·화면잠금.
 * 그 밖에서는 isAvailable 이 false 를 돌려주고 나머지 메서드는 {ok:false} 로 닫힌다.
 *
 * 🔴 모든 실패는 call.resolve({ok:false, code, message}) 로 돌려준다 — Capacitor 브리지는 플러그인
 * 예외를 프로세스 크래시로 바꾼다(vc41 사고, CodeDestinyLockScreenPlugin 참조). 그래서 본문 전체를
 * try/catch(Throwable) 로 감싼다. 콜백 스레드(executor)에서 resolve 해도 Capacitor 가 JS 로 넘긴다.
 */
@CapacitorPlugin(name = "CodeDestinyCredentials")
public class CodeDestinyCredentialsPlugin extends Plugin {
    private final Executor executor = Executors.newSingleThreadExecutor();

    private static boolean supportedSdk() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.P;
    }

    private static JSObject fail(String code, String message) {
        JSObject ret = new JSObject();
        ret.put("ok", false);
        ret.put("code", code);
        ret.put("message", message == null ? "" : message);
        return ret;
    }

    private static JSObject failFrom(Throwable error) {
        return fail(error.getClass().getSimpleName(), error.getMessage());
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        boolean gms = false;
        try {
            gms = GoogleApiAvailability.getInstance()
                    .isGooglePlayServicesAvailable(getContext()) == ConnectionResult.SUCCESS;
        } catch (Throwable ignored) {
            // GMS 부재 기기 — available=false 로 닫힌다.
        }
        ret.put("ok", true);
        ret.put("available", supportedSdk() && gms);
        ret.put("sdk", Build.VERSION.SDK_INT);
        ret.put("playServices", gms);
        call.resolve(ret);
    }

    /** {requestJson: PublicKeyCredentialCreationOptionsJSON} → {ok, responseJson, cloudBackup} */
    @PluginMethod
    public void create(PluginCall call) {
        String requestJson = call.getString("requestJson", "");
        if (!supportedSdk()) { call.resolve(fail("UNSUPPORTED", "Restore Credentials needs Android 9+.")); return; }
        if (requestJson == null || requestJson.isEmpty()) { call.resolve(fail("EMPTY_REQUEST", "requestJson is required.")); return; }
        createWith(call, requestJson, true);
    }

    private void createWith(final PluginCall call, final String requestJson, final boolean cloudBackup) {
        try {
            Activity activity = getActivity();
            if (activity == null) { call.resolve(fail("NO_ACTIVITY", "Activity is gone.")); return; }
            CredentialManager manager = CredentialManager.create(getContext());
            manager.createCredentialAsync(
                    activity,
                    new CreateRestoreCredentialRequest(requestJson, cloudBackup),
                    null,
                    executor,
                    new CredentialManagerCallback<CreateCredentialResponse, CreateCredentialException>() {
                        @Override
                        public void onResult(CreateCredentialResponse response) {
                            JSObject ret = new JSObject();
                            ret.put("ok", true);
                            ret.put("cloudBackup", cloudBackup);
                            ret.put("responseJson", response instanceof CreateRestoreCredentialResponse
                                    ? ((CreateRestoreCredentialResponse) response).getResponseJson()
                                    : "");
                            call.resolve(ret);
                        }

                        @Override
                        public void onError(CreateCredentialException error) {
                            // 백업·화면잠금이 없는 기기: 문서가 권하는 대로 기기 로컬 저장으로 한 번 물러선다.
                            if (cloudBackup && error instanceof E2eeUnavailableException) {
                                createWith(call, requestJson, false);
                                return;
                            }
                            call.resolve(failFrom(error));
                        }
                    });
        } catch (Throwable error) {
            call.resolve(failFrom(error));
        }
    }

    /** {requestJson: PublicKeyCredentialRequestOptionsJSON} → {ok, responseJson}. 없으면 code=NoCredentialException(정상). */
    @PluginMethod
    public void restore(PluginCall call) {
        String requestJson = call.getString("requestJson", "");
        if (!supportedSdk()) { call.resolve(fail("UNSUPPORTED", "Restore Credentials needs Android 9+.")); return; }
        if (requestJson == null || requestJson.isEmpty()) { call.resolve(fail("EMPTY_REQUEST", "requestJson is required.")); return; }
        try {
            Activity activity = getActivity();
            if (activity == null) { call.resolve(fail("NO_ACTIVITY", "Activity is gone.")); return; }
            // GetRestoreCredentialOption 은 다른 옵션과 섞을 수 없다(userVerification 이 discouraged 로 고정).
            GetCredentialRequest request = new GetCredentialRequest.Builder()
                    .addCredentialOption(new GetRestoreCredentialOption(requestJson))
                    .build();
            CredentialManager.create(getContext()).getCredentialAsync(
                    activity,
                    request,
                    null,
                    executor,
                    new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                        @Override
                        public void onResult(GetCredentialResponse response) {
                            Credential credential = response.getCredential();
                            if (!(credential instanceof RestoreCredential)) {
                                call.resolve(fail("NOT_RESTORE_CREDENTIAL", credential.getType()));
                                return;
                            }
                            JSObject ret = new JSObject();
                            ret.put("ok", true);
                            ret.put("responseJson", ((RestoreCredential) credential).getAuthenticationResponseJson());
                            call.resolve(ret);
                        }

                        @Override
                        public void onError(GetCredentialException error) {
                            call.resolve(failFrom(error));
                        }
                    });
        } catch (Throwable error) {
            call.resolve(failFrom(error));
        }
    }

    /** 로그아웃·탈퇴 뒤 호출. 다음 기기 복원에서 이 계정이 되살아나지 않게 한다. */
    @PluginMethod
    public void clear(PluginCall call) {
        if (!supportedSdk()) { call.resolve(fail("UNSUPPORTED", "Restore Credentials needs Android 9+.")); return; }
        try {
            CredentialManager.create(getContext()).clearCredentialStateAsync(
                    new ClearCredentialStateRequest(ClearCredentialStateRequest.TYPE_CLEAR_RESTORE_CREDENTIAL),
                    null,
                    executor,
                    new CredentialManagerCallback<Void, ClearCredentialException>() {
                        @Override
                        public void onResult(Void unused) {
                            JSObject ret = new JSObject();
                            ret.put("ok", true);
                            call.resolve(ret);
                        }

                        @Override
                        public void onError(ClearCredentialException error) {
                            call.resolve(failFrom(error));
                        }
                    });
        } catch (Throwable error) {
            call.resolve(failFrom(error));
        }
    }
}
