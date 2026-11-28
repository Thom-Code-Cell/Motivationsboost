package com.thanalytica.motivationsboost;

import android.net.Uri;
import com.google.androidbrowserhelper.trusted.LauncherActivity;

public final class MotivationsboostActivity extends LauncherActivity {
    @Override
    protected Uri getLaunchingUrl() {
        Uri defaultUrl = Uri.parse(getString(R.string.launch_url));
        Uri requestedUrl = super.getLaunchingUrl();
        if (!"https".equals(requestedUrl.getScheme())
                || !defaultUrl.getEncodedAuthority().equals(requestedUrl.getEncodedAuthority())) {
            return defaultUrl;
        }

        String path = requestedUrl.getEncodedPath();
        return path != null && (path.equals("/android") || path.startsWith("/android/"))
                && !path.contains(".") && !path.contains("%") ? requestedUrl : defaultUrl;
    }
}
