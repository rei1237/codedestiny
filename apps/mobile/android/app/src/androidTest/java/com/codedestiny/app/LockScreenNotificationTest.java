package com.codedestiny.app;
import android.app.Notification;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.*;
import org.junit.runner.RunWith;
import org.json.JSONObject;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class LockScreenNotificationTest {
    Context ctx; SharedPreferences prefs; String state, content; boolean enabled;
    @Before public void prepare() throws Exception {
        ctx=InstrumentationRegistry.getInstrumentation().getTargetContext();
        prefs=ctx.getSharedPreferences(CodeDestinyLockScreenPlugin.PREFS,0);
        state=prefs.getString("state_json", "");content=prefs.getString(LockScreenNotify.SNAPSHOT, "");enabled=prefs.getBoolean("enabled",false);
        if(Build.VERSION.SDK_INT>=33) InstrumentationRegistry.getInstrumentation().getUiAutomation().grantRuntimePermission(ctx.getPackageName(),"android.permission.POST_NOTIFICATIONS");
        prefs.edit().putBoolean("enabled",true).putString("state_json","{\"prefs\":{\"enabled\":true,\"locale\":\"ko\",\"quietEnabled\":false,\"pigPoseKey\":\"yeoni\"}}")
            .putString(LockScreenNotify.SNAPSHOT,"{\"locale\":\"ko\",\"quote\":{\"title\":\"명언\",\"text\":\"테스트 명언\"},\"daily\":{\"title\":\"일일 운세\",\"text\":\"PRIVATE_TEST_SENTINEL\"},\"affirmation\":{\"title\":\"긍정 확언\",\"text\":\"테스트 확언\"},\"privateSummary\":\"잠금 해제 후 확인\"}").commit();
    }
    @After public void restore(){if("true".equals(InstrumentationRegistry.getArguments().getString("keepEvidence")))return;LockScreenNotify.cancelContent(ctx);prefs.edit().putBoolean("enabled",enabled).putString("state_json",state).putString(LockScreenNotify.SNAPSHOT,content).commit();}
    Notification posted(){for(int i=0;i<20;i++){android.service.notification.StatusBarNotification[] active=ctx.getSystemService(NotificationManager.class).getActiveNotifications();for(android.service.notification.StatusBarNotification item:active)if(item.getId()==4800)return item.getNotification();android.os.SystemClock.sleep(50);}throw new AssertionError("Notification not posted");}
    void option(String key,boolean value)throws Exception{JSONObject root=new JSONObject(prefs.getString("state_json",""));root.getJSONObject("prefs").put(key,value);prefs.edit().putString("state_json",root.toString()).commit();}
    @Test public void safePrivateNotification(){assertTrue(LockScreenNotify.postContent(ctx,4800,true));Notification n=posted();assertEquals(Notification.VISIBILITY_PRIVATE,n.visibility);assertNotNull(n.publicVersion);assertNotNull(n.contentIntent);assertNull(n.fullScreenIntent);assertEquals("테스트 명언",n.publicVersion.extras.getString(Notification.EXTRA_TEXT));}
    @Test public void masterOff(){prefs.edit().putBoolean("enabled",false).commit();assertFalse(LockScreenNotify.postContent(ctx,4800,true));}
    @Test public void allContentOff()throws Exception{option("quoteEnabled",false);option("dailyEnabled",false);option("affirmationEnabled",false);assertFalse(LockScreenNotify.postContent(ctx,4800,true));}
    @Test public void dailyIsRedacted()throws Exception{option("quoteEnabled",false);option("affirmationEnabled",false);assertTrue(LockScreenNotify.postContent(ctx,4800,true));assertEquals("잠금 해제 후 확인",posted().extras.getString(Notification.EXTRA_TEXT));assertEquals("잠금 해제 후 확인",posted().publicVersion.extras.getString(Notification.EXTRA_TEXT));}
    @Test public void oldLocaleCannotPost()throws Exception{JSONObject root=new JSONObject(prefs.getString("state_json",""));root.getJSONObject("prefs").put("locale","ja");prefs.edit().putString("state_json",root.toString()).commit();assertFalse(LockScreenNotify.postContent(ctx,4800,true));}
    // Opt-in fixture for emulator screenshots; never bundled into release or called by app users.
    @Test public void captureEvidence()throws Exception{
        org.junit.Assume.assumeTrue("true".equals(InstrumentationRegistry.getArguments().getString("keepEvidence")));
        String kind=InstrumentationRegistry.getArguments().getString("kind","quote");
        for(String k:new String[]{"quote","affirmation","daily"})option(k+"Enabled",k.equals(kind));
        JSONObject root=new JSONObject(prefs.getString("state_json",""));root.getJSONObject("prefs").put("pigPoseKey",InstrumentationRegistry.getArguments().getString("character","yeoni"));prefs.edit().putString("state_json",root.toString()).commit();
        JSONObject snap=new JSONObject(prefs.getString(LockScreenNotify.SNAPSHOT,""));
        snap.getJSONObject("quote").put("text","오늘 할 수 있는 한 가지부터 시작해도 충분해. — 영냥이의 한마디");
        snap.getJSONObject("affirmation").put("text","나는 내 속도로 한 걸음씩 나아가도 괜찮아.");
        prefs.edit().putString(LockScreenNotify.SNAPSHOT,snap.toString()).commit();
        assertTrue(LockScreenNotify.postContent(ctx,4800,true));assertNotNull(posted().getLargeIcon());
    }
}
