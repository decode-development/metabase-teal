(ns metabase.channel.email.logo-test
  (:require
   [clojure.string :as str]
   [clojure.test :refer :all]
   [metabase.channel.email.logo :as email.logo]
   [metabase.test :as mt]))

(set! *warn-on-reflection* true)

(deftest default-logo-is-embedded-in-the-brand-color-test
  (testing "the logo we ship is rasterized and embedded, rather than hotlinked from static.metabase.com"
    (let [{:keys [image-src attachment]} (email.logo/logo-bundle email.logo/default-logo-url)]
      (is (str/starts-with? image-src "cid:")
          "the template should reference an inline attachment")
      (is (some? attachment))
      (is (not (str/includes? image-src "metabase.com")))))

  (testing "the rasterized logo picks up the brand color"
    (mt/with-premium-features #{:whitelabel}
      ;; the content-id is a hash of the PNG bytes, so a differing `image-src` means a differing image
      (let [image-src (fn [] (:image-src (email.logo/logo-bundle email.logo/default-logo-url)))
            teal      (mt/with-temporary-setting-values [application-colors {:brand "#135756"}]
                        (image-src))
            magenta   (mt/with-temporary-setting-values [application-colors {:brand "#FF00FF"}]
                        (image-src))]
        (is (not= teal magenta)
            "a different brand color must produce a different image")))))

(deftest non-default-logo-urls-are-untouched-test
  (testing "an uploaded logo URL is passed through as-is"
    (is (= {:image-src "https://example.com/logo.png" :attachment nil}
           (email.logo/logo-bundle "https://example.com/logo.png"))))

  (testing "a data URI becomes an inline attachment"
    (let [{:keys [image-src attachment]}
          (email.logo/logo-bundle
           (str "data:image/svg+xml;base64,"
                "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg=="))]
      (is (str/starts-with? image-src "cid:"))
      (is (some? attachment))))

  (testing "nil logo URL yields no bundle"
    (is (nil? (email.logo/logo-bundle nil)))))
