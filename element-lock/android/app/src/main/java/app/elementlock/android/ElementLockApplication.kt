package app.elementlock.android

import android.app.Application

class ElementLockApplication : Application() {
    lateinit var controller: AppController
        private set

    override fun onCreate() {
        super.onCreate()
        controller = AppController(this)
    }
}

val android.content.Context.controller: AppController
    get() = (applicationContext as ElementLockApplication).controller
