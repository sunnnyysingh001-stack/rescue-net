package dev.sunny.rescue;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest(
  properties = {
    "spring.datasource.url=jdbc:h2:mem:rescuetest;DB_CLOSE_DELAY=-1",
    "app.jwt-secret=test-secret-at-least-32-characters-long",
    "app.coordinator-password=coordinator-test-password",
    "app.viewer-password=viewer-test-password",
  }
)
@AutoConfigureMockMvc
class ApiTest {

  @Autowired
  MockMvc mvc;

  @Autowired
  StateRepository repo;

  @Autowired
  ObjectMapper json;

  @Autowired
  Operations ops;

  @Autowired
  TransactionTemplate tx;

  @BeforeEach
  void reset() {
    tx.execute(s -> {
      try {
        var r = repo.findById(1L).orElseThrow();
        r.payload = json.writeValueAsString(Operations.seed());
        repo.saveAndFlush(r);
      } catch (Exception e) {
        throw new RuntimeException(e);
      }
      return null;
    });
  }

  @Test
  void authenticationRequired() throws Exception {
    mvc.perform(get("/api/state")).andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockUser(roles = "VIEWER")
  void viewerCanReadButNotWrite() throws Exception {
    mvc.perform(get("/api/state")).andExpect(status().isOk());
    mvc
      .perform(post("/api/incidents/INC-1001/advance"))
      .andExpect(status().isForbidden());
  }

  @Test
  @WithMockUser(roles = "COORDINATOR")
  void invalidInputRejected() throws Exception {
    mvc
      .perform(
        post("/api/incidents")
          .contentType("application/json")
          .content(
            "{\"title\":\"\",\"location\":\"A\",\"severity\":\"HIGH\",\"people\":0}"
          )
      )
      .andExpect(status().isBadRequest());
  }

  @Test
  @WithMockUser(roles = "COORDINATOR")
  void reportPersists() throws Exception {
    mvc
      .perform(
        post("/api/incidents")
          .contentType("application/json")
          .content(
            "{\"title\":\"Shelter request\",\"location\":\"Zone A\",\"severity\":\"HIGH\",\"people\":5}"
          )
      )
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.incidents[0].status").value("REPORTED"));
    assertEquals(4, ops.get().incidents().size());
  }

  @Test
  void dispatchAndResolve() {
    ops.dispatch("test", "INC-1001", "T-01");
    assertThrows(Exception.class, () ->
      ops.dispatch("test", "INC-1002", "T-01")
    );
    ops.advance("test", "INC-1001");
    ops.advance("test", "INC-1001");
    ops.dispatch("test", "INC-1002", "T-01");
    assertEquals("DISPATCHED", ops.get().incidents().get(1).status());
    assertThrows(Exception.class, () -> ops.advance("test", "INC-1001"));
  }

  @Test
  void cannotSkipStages() {
    assertThrows(Exception.class, () -> ops.advance("test", "INC-1001"));
    assertEquals("REPORTED", ops.get().incidents().get(0).status());
  }

  @Test
  void overAllocationRollsBack() {
    ops.allocate("test", "INC-1001", "R-01", 230);
    assertThrows(Exception.class, () ->
      ops.allocate("test", "INC-1002", "R-01", 11)
    );
    assertEquals(10, ops.get().resources().get(0).stock());
    assertEquals(1, ops.get().allocations().size());
  }

  @Test
  void concurrentDispatchHasOneWinner() throws Exception {
    var pool = Executors.newFixedThreadPool(2);
    try {
      var a = pool.submit(() -> {
        try {
          ops.dispatch("test", "INC-1001", "T-01");
          return true;
        } catch (Exception e) {
          return false;
        }
      });
      var b = pool.submit(() -> {
        try {
          ops.dispatch("test", "INC-1002", "T-01");
          return true;
        } catch (Exception e) {
          return false;
        }
      });
      assertNotEquals(a.get(10, TimeUnit.SECONDS), b.get(10, TimeUnit.SECONDS));
      assertEquals(
        1,
        ops
          .get()
          .incidents()
          .stream()
          .filter(i -> "T-01".equals(i.teamId()))
          .count()
      );
    } finally {
      pool.shutdownNow();
    }
  }

  @Test
  void signedTokenWorksAndWrongPasswordFails() throws Exception {
    mvc
      .perform(
        post("/api/auth/login")
          .contentType("application/json")
          .content("{\"username\":\"viewer\",\"password\":\"wrong\"}")
      )
      .andExpect(status().isUnauthorized());
    String body = mvc
      .perform(
        post("/api/auth/login")
          .contentType("application/json")
          .content(
            "{\"username\":\"viewer\",\"password\":\"viewer-test-password\"}"
          )
      )
      .andExpect(status().isOk())
      .andReturn()
      .getResponse()
      .getContentAsString();
    String token = json.readTree(body).get("token").asText();
    mvc
      .perform(get("/api/state").header("Authorization", "Bearer " + token))
      .andExpect(status().isOk());
    mvc
      .perform(
        post("/api/incidents/INC-1001/advance").header(
          "Authorization",
          "Bearer " + token
        )
      )
      .andExpect(status().isForbidden());
    mvc
      .perform(get("/api/state").header("Authorization", "Bearer broken"))
      .andExpect(status().isUnauthorized());
  }
}
