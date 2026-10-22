package dev.sunny.rescue;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
class Security {

  @Bean
  SecretKeySpec key(@Value("${app.jwt-secret}") String s) {
    if (s.length() < 32) throw new IllegalArgumentException(
      "JWT_SECRET must contain at least 32 characters"
    );
    return new SecretKeySpec(
      s.getBytes(java.nio.charset.StandardCharsets.UTF_8),
      "HmacSHA256"
    );
  }

  @Bean
  JwtEncoder encoder(SecretKeySpec k) {
    return new NimbusJwtEncoder(new ImmutableSecret<>(k));
  }

  @Bean
  JwtDecoder decoder(SecretKeySpec k) {
    var d = NimbusJwtDecoder.withSecretKey(k)
      .macAlgorithm(MacAlgorithm.HS256)
      .build();
    d.setJwtValidator(JwtValidators.createDefaultWithIssuer("rescue-net"));
    return d;
  }

  @Bean
  SecurityFilterChain filter(HttpSecurity h) throws Exception {
    var roles = new JwtGrantedAuthoritiesConverter();
    roles.setAuthoritiesClaimName("role");
    roles.setAuthorityPrefix("ROLE_");
    var converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(roles);
    return h
      .csrf(c -> c.disable())
      .sessionManagement(s ->
        s.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
      )
      .authorizeHttpRequests(a ->
        a
          .requestMatchers("/api/auth/login")
          .permitAll()
          .requestMatchers(HttpMethod.GET, "/api/state")
          .authenticated()
          .requestMatchers("/api/**")
          .hasRole("COORDINATOR")
          .anyRequest()
          .permitAll()
      )
      .oauth2ResourceServer(o ->
        o.jwt(j -> j.jwtAuthenticationConverter(converter))
      )
      .build();
  }
}
