(ns metabase.channel.email.logo
  (:require
   [clojure.string :as str]
   [metabase.appearance.core :as appearance]
   [metabase.channel.render.core :as channel.render]
   [metabase.util.jvm :as u.jvm]))

(set! *warn-on-reflection* true)

(def default-logo-url
  "The `application-logo-url` value meaning \"the logo we ship\", as opposed to one an admin uploaded."
  "app/assets/img/logo.svg")

(def ^:private data-uri-pattern
  #"^data:([^;]+);base64,(.+)$")

(defn- parse-data-uri
  "Parse a data URI and return {:content-type <string> :bytes <byte-array>}, or nil if not a data URI."
  [data-uri]
  (when-let [[_ content-type base64-data] (re-matches data-uri-pattern data-uri)]
    {:content-type content-type
     :bytes        (u.jvm/decode-base64-to-bytes base64-data)}))

(defn- attachment-bundle
  "Wrap PNG `bytes` as an inline (`cid:`) email attachment."
  [bytes]
  (let [bundle (channel.render/make-image-bundle :attachment bytes)]
    {:image-src  (:image-src bundle)
     :attachment (channel.render/image-bundle->attachment bundle)}))

(def ^:private branded-logo-bundle
  ;; Memoized on the brand color so a run of emails rasterizes the logo once. Cheap to hold: one small PNG.
  (memoize (fn [color] (attachment-bundle (channel.render/branded-logo color)))))

(defn logo-bundle
  "Create a logo bundle from the application logo URL.
   Returns {:image-src <url-or-cid> :attachment <attachment-map-or-nil>}.
   For the default logo asset path, rasterizes the logo in the brand color and embeds it.
   For data URIs, converts to an embedded attachment for email compatibility."
  [logo-url]
  (cond
    (nil? logo-url)
    nil

    ;; Upstream points this at `http://static.metabase.com/email_logo.png`, a fixed blue PNG. That ignores the
    ;; brand color and makes every email fetch a remote asset over plain HTTP, so render our own instead.
    (= logo-url default-logo-url)
    (branded-logo-bundle (appearance/application-color))

    (str/starts-with? logo-url "data:")
    (when-let [{:keys [bytes]} (parse-data-uri logo-url)]
      (attachment-bundle bytes))

    :else
    {:image-src  logo-url
     :attachment nil}))
